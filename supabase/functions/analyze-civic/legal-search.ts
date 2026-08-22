// GitHub-only legal source retrieval for THE GATE®.
// This helper does not use Supabase tables and does not modify civic_guide.ts.
// It reads the public legal-text library from the feature branch and returns
// bounded, source-labelled excerpts for the existing AI prompt.

const LEGAL_REPO_OWNER = "Gates774";
const LEGAL_REPO_NAME = "TheGate774";
const LEGAL_BRANCH = "main";
const METADATA_PATH = "laws/metadata_github.csv";

const MAX_METADATA_CANDIDATES = 32;
const MAX_FETCHES = 16;
const MAX_RESULTS = 8;
const MAX_EXCERPT_CHARS = 7000;
const MAX_EXCERPT_WINDOWS = 3;
const WINDOW_CHARS = 2200;
const REQUEST_TIMEOUT_MS = 7000;

export type LegalSource = {
  shortId: string;
  title: string;
  year: string;
  sourcePath: string;
  textPath: string;
  authorityTypes: string[];
  matchStrength: "strong" | "moderate";
  excerpt: string;
};

type MetadataRow = {
  short_id: string;
  batch: string;
  title: string;
  year: string;
  original_source_path: string;
  text_path: string;
};

type ScoredRow = { row: MetadataRow; score: number; authorityTypes: string[] };
type FetchedRow = ScoredRow & { text: string; textScore: number };

let metadataPromise: Promise<MetadataRow[]> | undefined;

function libraryPath(path: string): string {
  const cleanPath = path.replace(/^\/+/, "");

  // metadata_github.csv stores text_path as laws_text/... while the uploaded
  // GitHub library is stored under laws/text/.... Normalize both forms here.
  if (cleanPath === "laws_text" || cleanPath.startsWith("laws_text/")) {
    return `laws/text/${cleanPath.slice("laws_text".length).replace(/^\/+/, "")}`;
  }
  if (cleanPath.startsWith("laws/")) return cleanPath;
  return `laws/${cleanPath}`;
}

function rawUrl(path: string): string {
  const safePath = libraryPath(path)
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `https://raw.githubusercontent.com/${LEGAL_REPO_OWNER}/${LEGAL_REPO_NAME}/${LEGAL_BRANCH}/${safePath}`;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function csvFields(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && quoted && next === '"') {
      field += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      fields.push(field.trim());
      field = "";
      continue;
    }
    field += char;
  }

  fields.push(field.trim());
  return fields;
}

function parseCsv(csv: string): MetadataRow[] {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = csvFields(lines[0]);
  return lines.slice(1).map((line) => {
    const values = csvFields(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return {
      short_id: row.short_id ?? "",
      batch: row.batch ?? "",
      title: row.title ?? "",
      year: row.year ?? "",
      original_source_path: row.original_source_path ?? row.source_path ?? "",
      text_path: row.text_path ?? "",
    };
  }).filter((row) => row.short_id && row.text_path);
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "text/plain" },
    });
    if (!response.ok) throw new Error(`GitHub fetch failed: ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function loadMetadata(): Promise<MetadataRow[]> {
  const csv = await fetchText(rawUrl(METADATA_PATH));
  return parseCsv(csv);
}

const STOP_WORDS = new Set([
  "the", "and", "for", "from", "with", "that", "this", "have", "has", "into", "about",
  "what", "when", "where", "which", "should", "could", "would", "does", "under", "their",
  "there", "they", "them", "your", "you", "are", "was", "were", "been", "being", "who",
  "how", "can", "may", "also", "case", "issue", "person", "people", "please", "help",
]);

const TERM_GROUPS: Record<string, string[]> = {
  molestation: ["molestation", "sexual abuse", "sexual assault", "rape", "indecent assault", "sexual harassment", "safeguarding", "child protection"],
  abuse: ["abuse", "assault", "violence", "exploitation", "harassment", "victim", "survivor"],
  student: ["student", "pupil", "undergraduate", "university", "tertiary institution", "campus", "school"],
  university: ["university", "institution", "senate", "disciplinary committee", "student affairs", "dean", "vice chancellor"],
  exam: ["exam", "examination", "examination malpractice", "exam malpractice", "academic misconduct", "academic dishonesty", "cheating", "impersonation"],
  malpractice: ["malpractice", "examination malpractice", "academic misconduct", "fraud", "false pretence", "forgery"],
  corruption: ["corruption", "bribery", "official corruption", "abuse of office", "economic crime", "financial crime", "icpc", "efcc"],
  police: ["police", "criminal investigation", "crime", "offence", "prosecution", "investigation"],
  complaint: ["complaint", "petition", "report", "grievance", "complainant", "redress"],
  data: ["personal data", "privacy", "data protection", "consent", "confidentiality"],
  labour: ["employment", "worker", "labour", "workplace", "employer", "employee"],
  child: ["child", "minor", "children", "juvenile", "young person"],
  disability: ["disability", "person with disability", "discrimination", "equal opportunity"],
};

function expandedPhrases(query: string): string[] {
  const normalized = normalize(query);
  const terms = normalized
    .split(" ")
    .filter((term) => term.length >= 3 && !STOP_WORDS.has(term));
  const expanded = new Set(terms);

  for (const [trigger, phrases] of Object.entries(TERM_GROUPS)) {
    if (normalized.includes(trigger) || phrases.some((phrase) => normalized.includes(phrase))) {
      phrases.forEach((phrase) => expanded.add(normalize(phrase)));
    }
  }

  return [...expanded];
}

function isConstitutionalSource(row: MetadataRow): boolean {
  const value = normalize(`${row.title} ${row.original_source_path}`);
  return value.includes("constitution of the federal republic of nigeria");
}

function authorityTypesFor(text: string): string[] {
  const value = normalize(text);
  const types = new Set<string>();
  if (value.includes("constitution")) types.add("constitutional source");
  if (/(police|criminal|offence|prosecution|investigation|assault|rape)/.test(value)) types.add("criminal or police");
  if (/(university|student|school|campus|senate|disciplinary|academic)/.test(value)) types.add("institutional or disciplinary");
  if (/(corruption|bribery|icpc|efcc|economic crime|abuse of office)/.test(value)) types.add("anti-corruption or regulatory");
  if (/(child|minor|safeguard|sexual|victim|violence|protection)/.test(value)) types.add("protection or safeguarding");
  if (/(employment|labour|worker|employer|employee)/.test(value)) types.add("employment or labour");
  if (/(court|tribunal|appeal|judicial|remedy|redress)/.test(value)) types.add("court, tribunal, or remedy");
  return [...types];
}

function includesTerm(value: string, term: string): boolean {
  if (term.includes(" ")) return value.includes(term);
  return value.split(" ").includes(term);
}

function metadataScore(row: MetadataRow, phrases: string[]): ScoredRow {
  const title = normalize(row.title);
  const source = normalize(row.original_source_path);
  const combined = `${title} ${source}`;
  let score = 0;

  for (const phrase of phrases) {
    if (includesTerm(title, phrase)) score += phrase.includes(" ") ? 18 : 10;
    else if (includesTerm(source, phrase)) score += phrase.includes(" ") ? 12 : 7;
    else if (includesTerm(combined, phrase)) score += 2;
  }

  const authorityTypes = authorityTypesFor(`${row.title} ${row.original_source_path}`);
  if (authorityTypes.length > 0) score += 1;
  return { row, score, authorityTypes };
}

function escapedTerm(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function textScore(text: string, phrases: string[]): number {
  const normalized = normalize(text);
  return phrases.reduce((score, phrase) => {
    const matches = normalized.match(new RegExp(`\\b${escapedTerm(phrase)}\\b`, "g"));
    return score + Math.min(matches?.length ?? 0, 12) * (phrase.includes(" ") ? 3 : 1);
  }, 0);
}

function excerptAroundTerms(text: string, phrases: string[]): string {
  const clean = text.replace(/\0/g, "").replace(/[ \t]+\n/g, "\n").trim();
  if (clean.length <= MAX_EXCERPT_CHARS) return clean;

  const normalized = normalize(clean);
  const positions = phrases
    .map((phrase) => normalized.indexOf(phrase))
    .filter((position) => position >= 0)
    .sort((a, b) => a - b);

  const windows: string[] = [];
  for (const position of positions.slice(0, MAX_EXCERPT_WINDOWS)) {
    const start = Math.max(0, Math.min(position - 900, clean.length - WINDOW_CHARS));
    const window = clean.slice(start, start + WINDOW_CHARS).trim();
    if (window && !windows.includes(window)) windows.push(window);
  }

  if (windows.length === 0) return clean.slice(0, MAX_EXCERPT_CHARS).trim();
  return windows.join("\n\n[... additional relevant passage ...]\n\n").slice(0, MAX_EXCERPT_CHARS).trim();
}

export async function searchLegalSources(
  query: string,
  options: { maxResults?: number } = {},
): Promise<LegalSource[]> {
  const phrases = expandedPhrases(query);
  if (phrases.length === 0) return [];

  if (!metadataPromise) {
    metadataPromise = loadMetadata().catch((error) => {
      metadataPromise = undefined;
      throw error;
    });
  }

  const metadata = await metadataPromise;
  const scored = metadata.map((row) => metadataScore(row, phrases));

  // Always provide the model with a constitutional source so it can quote or
  // accurately paraphrase the relevant constitutional foundation. The source
  // is supplemental and the prompt still requires the model to use it only
  // when it is materially relevant to the facts.
  const constitutionalCandidates = scored
    .filter(({ row }) => isConstitutionalSource(row))
    .sort((a, b) => {
      const aPromulgation = normalize(a.row.title).includes("promulgation") ? 1 : 0;
      const bPromulgation = normalize(b.row.title).includes("promulgation") ? 1 : 0;
      return (bPromulgation - aPromulgation) || (b.score - a.score);
    })
    .slice(0, 2);

  const topicalCandidates = scored
    .filter(({ row }) => !isConstitutionalSource(row))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_METADATA_CANDIDATES);

  const candidates = [...constitutionalCandidates, ...topicalCandidates]
    .filter((candidate, index, all) => all.findIndex((item) => item.row.short_id === candidate.row.short_id) === index)
    .slice(0, MAX_FETCHES);

  const fetched = await Promise.all(candidates.map(async (candidate) => {
    try {
      const text = await fetchText(rawUrl(candidate.row.text_path));
      return { ...candidate, text, textScore: textScore(text, phrases) } as FetchedRow;
    } catch (error) {
      console.warn("legal source fetch skipped", candidate.row.short_id, error);
      return null;
    }
  }));

  const limit = Math.min(options.maxResults ?? MAX_RESULTS, MAX_RESULTS);
  return fetched
    .filter((item): item is FetchedRow => Boolean(item))
    .sort((a, b) => (b.textScore + b.score) - (a.textScore + a.score))
    .filter((item) => item.textScore > 0 || item.score > 0)
    .slice(0, limit)
    .map(({ row, text, textScore: score, authorityTypes }) => ({
      shortId: row.short_id,
      title: row.title,
      year: row.year,
      sourcePath: row.original_source_path,
      textPath: row.text_path,
      authorityTypes: authorityTypes.length > 0 ? authorityTypes : ["statutory source"],
      matchStrength: score >= 6 ? "strong" : "moderate",
      excerpt: excerptAroundTerms(text, phrases),
    }));
}

export function formatLegalSources(sources: LegalSource[]): string {
  if (sources.length === 0) return "";
  return sources.map((source, index) => [
    `[Legal source ${index + 1} — ${source.matchStrength} match] ${source.title}${source.year ? ` (${source.year})` : ""}`,
    `Authority area(s): ${source.authorityTypes.join("; ")}`,
    `Source file: ${source.sourcePath}`,
    `GitHub text path: ${source.textPath}`,
    source.excerpt,
  ].join("\n")).join("\n\n---\n\n");
}
