// GitHub-only legal source retrieval for THE GATE®.
// This helper does not use Supabase tables and does not modify civic_guide.ts.
// It reads the public legal-text library from the feature branch and returns
// bounded, source-labelled excerpts for the existing AI prompt.

const LEGAL_REPO_OWNER = "Gates774";
const LEGAL_REPO_NAME = "TheGate774";
const LEGAL_BRANCH = "main";
const METADATA_PATH = "laws/metadata_github.csv";
const MDA_DIRECTORY_PATH = "laws/mda/nigeria-mda-directory.txt";
const MDA_SOURCE_LABEL = "Nigerian MDA directory";
const MAX_MDA_RESULTS = 6;
const MAX_MDA_CONTEXT_CHARS = 12000;

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
  provisions: string[];
  excerpt: string;
};

export type MdaSource = {
  institution: string;
  website: string | null;
  addressContact: string | null;
  category: string;
  mandate: string;
  aliases: string[];
  issueTerms: string[];
  jurisdiction: "federal" | "state" | "local" | "national";
  sourcePath: string;
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
type SectionBlock = { label: string; text: string; start: number; end: number };
type SectionExcerpt = { excerpt: string; score: number; provisions: string[] };
type FetchedRow = ScoredRow & { text: string; textScore: number };

let metadataPromise: Promise<MetadataRow[]> | undefined;
let mdaDirectoryPromise: Promise<string> | undefined;

function libraryPath(path: string): string {
  const cleanPath = path.replace(/^\/+/, "");

  // metadata_github.csv stores text_path as laws_text/... while the uploaded
  // GitHub library is stored under laws/text/.... Normalize that mismatch.
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

async function loadMdaDirectory(): Promise<string> {
  if (!mdaDirectoryPromise) {
    mdaDirectoryPromise = fetchText(rawUrl(MDA_DIRECTORY_PATH)).catch((error) => {
      mdaDirectoryPromise = undefined;
      throw error;
    });
  }
  return mdaDirectoryPromise;
}

const STOP_WORDS = new Set([
  "the", "and", "for", "from", "with", "that", "this", "have", "has", "into", "about",
  "what", "when", "where", "which", "should", "could", "would", "does", "under", "their",
  "there", "they", "them", "your", "you", "are", "was", "were", "been", "being", "who",
  "how", "can", "may", "also", "case", "issue", "person", "people", "please", "help",
]);

const MDA_TERM_GROUPS: Record<string, string[]> = {
  oil: ["oil", "petroleum", "pipeline", "oilfield", "oil mining", "licence", "license", "permit", "upstream", "midstream", "downstream", "spill", "pollution", "gas", "refinery", "local content"],
  education: ["education", "student", "school", "university", "examination", "exam", "academic", "tertiary"],
  health: ["health", "hospital", "medical", "drug", "medicine", "patient"],
  crime: ["police", "crime", "fraud", "corruption", "investigation", "victim"],
  environment: ["environment", "pollution", "spill", "waste", "flood", "water"],
  labour: ["labour", "employment", "worker", "employer", "workplace"],
  complaint: ["complaint", "petition", "report", "redress", "ombudsman"],
};

const TERM_GROUPS: Record<string, string[]> = {
  molestation: ["molestation", "sexual abuse", "sexual assault", "rape", "indecent assault", "sexual harassment", "safeguarding", "child protection"],
  abuse: ["abuse", "assault", "violence", "exploitation", "harassment", "victim", "survivor"],
  student: ["student", "pupil", "undergraduate", "university", "tertiary institution", "campus", "school"],
  university: ["university", "institution", "senate", "disciplinary committee", "student affairs", "dean", "vice chancellor"],
  exam: ["exam", "examination", "examination malpractice", "exam malpractice", "academic misconduct", "academic dishonesty", "cheating", "impersonation"],
    malpractice: ["malpractice", "examination malpractice", "academic misconduct", "fraud", "false pretence", "forgery"],
  marriage: ["wife", "husband", "spouse", "married", "marriage", "family", "property"],
  theft: ["theft", "stealing", "stole", "stolen", "dishonestly", "property", "money", "convert"],
  corruption: ["corruption", "bribery", "official corruption", "abuse of office", "economic crime", "financial crime", "icpc", "efcc"],
  police: ["police", "criminal investigation", "crime", "offence", "prosecution", "investigation"],
  complaint: ["complaint", "petition", "report", "grievance", "complainant", "redress"],
  data: ["personal data", "privacy", "data protection", "consent", "confidentiality"],
  labour: ["employment", "worker", "labour", "workplace", "employer", "employee"],
  child: ["child", "minor", "children", "juvenile", "young person"],
  disability: ["disability", "person with disability", "discrimination", "equal opportunity"],
};

function expandedMdaPhrases(query: string): string[] {
  const value = normalize(query);
  const terms = new Set(value.split(" ").filter((term) => term.length >= 3));
  for (const phrases of Object.values(MDA_TERM_GROUPS)) {
    if (phrases.some((phrase) => value.includes(phrase))) {
      phrases.forEach((phrase) => terms.add(phrase));
    }
  }
  return [...terms];
}

function parseMdaRows(directory: string): Array<{ institution: string; website: string; addressContact: string; category: string; lineIndex: number }> {
  const lines = directory.replace(/\r/g, "").split("\n");
  const rows: Array<{ institution: string; website: string; addressContact: string; category: string; lineIndex: number }> = [];
  let category = "";
  const rowPattern = /^\s*(.*?)\s{2,}((?:https?:\/\/)?(?:www\.)?[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+(?:\/[^\s]*)?|—)\s{2,}(.*?)\s*$/;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trimEnd();
    const heading = line.match(/^\s*(\d{1,2})\.\s+(.+)$/);
    if (heading && !/^\d+\.$/.test(heading[2].trim())) category = heading[2].trim();
    const match = line.match(rowPattern);
    if (!match) continue;
    const institution = match[1].replace(/\s+/g, " ").trim();
    const website = match[2].trim();
    const addressParts = [match[3].replace(/\s+/g, " ").trim()];

    // Preserve wrapped address/contact lines until the next row or heading.
    let continuationIndex = index + 1;
    while (continuationIndex < lines.length) {
      const continuation = lines[continuationIndex].trim();
      if (!continuation) break;
      if (/^\d{1,2}\.\s+/.test(continuation) || rowPattern.test(lines[continuationIndex])) break;
      if (/^(?:NIGERIA|Compiled|Institution|Website|Address \/ Contact|Contents)$/i.test(continuation)) break;
      addressParts.push(continuation.replace(/\s+/g, " "));
      continuationIndex += 1;
    }

    if (!institution || institution.toLowerCase() === "institution") continue;
    rows.push({ institution, website, addressContact: addressParts.filter(Boolean).join(" ").trim(), category, lineIndex: index });
  }

  return rows;
}

const MANDATE_PROFILES: Array<{
  pattern: RegExp;
  mandate: string;
  aliases: string[];
  issueTerms: string[];
}> = [
  {
    pattern: /nigeria police force|\bnpf\b/i,
    mandate: "Police protection, crime prevention, criminal investigation, arrest, and public safety.",
    aliases: ["NPF", "police", "police station", "criminal investigation"],
    issueTerms: ["police", "crime", "criminal", "robbery", "theft", "assault", "kidnapping", "investigation", "police brutality", "emergency", "cybercrime"],
  },
  {
    pattern: /police service commission|\bpsc\b/i,
    mandate: "Oversight, discipline, and complaints concerning members of the Nigeria Police Force.",
    aliases: ["PSC", "police oversight", "police discipline"],
    issueTerms: ["police misconduct", "discipline", "unlawful conduct", "complaint against officer", "police oversight"],
  },
  {
    pattern: /economic and financial crimes commission|\befcc\b/i,
    mandate: "Investigation and prosecution of economic and financial crimes.",
    aliases: ["EFCC", "financial crime", "economic crime"],
    issueTerms: ["fraud", "bribery", "corruption", "money laundering", "financial crime", "economic crime"],
  },
  {
    pattern: /independent corrupt practices|\bicpc\b/i,
    mandate: "Prevention, investigation, and prosecution of corrupt practices and abuse of office.",
    aliases: ["ICPC", "corruption", "abuse of office"],
    issueTerms: ["corruption", "bribery", "abuse of office", "public official"],
  },
  {
    pattern: /national agency for food and drug|\bnafdac\b/i,
    mandate: "Regulation and control of food, drugs, medical products, and related consumer health products.",
    aliases: ["NAFDAC", "fake drug", "food safety"],
    issueTerms: ["fake drug", "counterfeit medicine", "medicine", "food safety", "drug", "medical product"],
  },
  {
    pattern: /federal road safety|\bfrsc\b/i,
    mandate: "Road safety administration, traffic enforcement, and road-transport safety.",
    aliases: ["FRSC", "road safety", "traffic"],
    issueTerms: ["road safety", "traffic", "driver", "vehicle", "road accident", "checkpoint"],
  },
  {
    pattern: /national human rights commission|\bnhrc\b/i,
    mandate: "Protection, promotion, and investigation of human-rights violations.",
    aliases: ["NHRC", "human rights", "rights violation"],
    issueTerms: ["human rights", "torture", "unlawful detention", "discrimination", "rights violation"],
  },
];

function authorityProfile(institution: string, category: string): { mandate: string; aliases: string[]; issueTerms: string[] } {
  const profile = MANDATE_PROFILES.find((item) => item.pattern.test(institution));
  if (profile) return profile;
  return {
    mandate: `${category || "Public institution"} responsibilities as described by the Nigerian MDA directory.`,
    aliases: [],
    issueTerms: [category, institution].filter(Boolean),
  };
}

function authorityScore(source: MdaSource, query: string): number {
  const value = normalize(query);
  const terms = [...source.aliases, ...source.issueTerms, source.institution, source.category]
    .map(normalize)
    .filter((term) => term.length >= 3);
  let score = 0;
  for (const term of terms) {
    if (term.includes(" ") ? value.includes(term) : value.split(" ").includes(term)) {
      score += source.issueTerms.includes(term) ? 12 : 8;
    }
  }
  if (source.mandate && source.issueTerms.some((term) => value.includes(normalize(term)))) score += 10;
  return score;
}

function mdaRowScore(row: { institution: string; website: string; addressContact: string; category: string }, phrases: string[]): number {
  const value = normalize(`${row.institution} ${row.website} ${row.addressContact} ${row.category}`);
  let score = 0;
  for (const phrase of phrases) {
    if (value.includes(phrase)) score += phrase.includes(" ") ? 4 : 1;
  }
  return score;
}

export async function searchMdaDirectory(
  query: string,
  options: { maxResults?: number } = {},
): Promise<MdaSource[]> {
  const phrases = expandedMdaPhrases(query);
  if (phrases.length === 0) return [];
  const directory = await loadMdaDirectory();
  const lines = directory.replace(/\r/g, "").split("\n");
  const rows = parseMdaRows(directory);
  const matches = rows
    .map((row) => ({ row, score: mdaRowScore(row, phrases) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, options.maxResults ?? MAX_MDA_RESULTS);

  const sources = matches.map(({ row, score }) => {
    const excerpt = lines.slice(Math.max(0, row.lineIndex - 1), Math.min(lines.length, row.lineIndex + 4)).join("\n").trim();
    const profile = authorityProfile(row.institution, row.category);
    const source: MdaSource = {
      institution: row.institution,
      website: row.website === "—" ? null : row.website,
      addressContact: row.addressContact || null,
      category: row.category,
      mandate: profile.mandate,
      aliases: profile.aliases,
      issueTerms: profile.issueTerms,
      jurisdiction: /state/i.test(row.category) ? "state" : "federal",
      sourcePath: MDA_DIRECTORY_PATH,
      matchStrength: score >= 5 ? "strong" : "moderate",
      excerpt: excerpt.slice(0, 2400),
    };
    return source;
  });

  return sources
    .map((source) => ({ source, authorityScore: authorityScore(source, query) }))
    .sort((a, b) => b.authorityScore - a.authorityScore)
    .map(({ source }) => source);
}

export function formatMdaSources(sources: MdaSource[]): string {
  if (sources.length === 0) return "";
  return sources.map((source, index) => [
    `[MDA source ${index + 1} — ${source.matchStrength} match] ${source.institution}`,
    `Category: ${source.category || "Not specified in directory"}`,
    `Mandate: ${source.mandate}`,
    `Website: ${source.website === "—" ? "Not listed" : source.website}`,
    `Address / Contact: ${source.addressContact || "Not listed"}`,
    `Directory source: ${MDA_SOURCE_LABEL}`,
    `Directory passage: ${source.excerpt}`,
  ].join("\n")).join("\n\n---\n\n");
}

function extractSections(text: string): SectionBlock[] {
  const sections: SectionBlock[] = [];
  const marker = /(?:^|\n)[ \t]*(?:(?:section|sec\.?)[ \t]+)?(\d+[A-Za-z]?(?:\s*\([^)]+\))?)[ \t]*\.[ \t]*/gi;
  const matches = [...text.matchAll(marker)];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? text.length;
    const number = match[1].replace(/\s+/g, "");
    const block = text.slice(start, end).trim();
    if (block.length >= 20) sections.push({ label: `Section ${number}`, text: block, start, end });
  }

  return sections;
}

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

function sectionAwareExcerpt(text: string, phrases: string[]): SectionExcerpt {
  const clean = text.replace(/\0/g, "").replace(/[ \t]+\n/g, "\n").trim();
  const sections = extractSections(clean);
  if (sections.length === 0) {
    return { excerpt: excerptAroundTerms(clean, phrases), score: textScore(clean, phrases), provisions: [] };
  }

  const ranked = sections
    .map((section) => ({
      section,
      score: textScore(section.text, phrases),
    }))
    .sort((a, b) => b.score - a.score || a.section.start - b.section.start);

  const selected = ranked.filter((item) => item.score > 0).slice(0, 4);
  const fallback = selected.length > 0 ? selected : ranked.slice(0, 2);
  const excerpt = fallback
    .map(({ section }) => `[${section.label}]\n${section.text}`)
    .join("\n\n---\n\n")
    .slice(0, MAX_EXCERPT_CHARS)
    .trim();

  return {
    excerpt,
    score: fallback.reduce((total, item) => total + item.score, 0),
    provisions: fallback.map(({ section }) => section.label),
  };
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

  // Statutes and Acts are the default legal authorities. The Constitution is
  // not forced into every result because the repository currently contains
  // only a placeholder rather than the full constitutional text.
  const candidates = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_METADATA_CANDIDATES)
    .slice(0, MAX_FETCHES);

  const fetched = await Promise.all(candidates.map(async (candidate) => {
    try {
      const text = await fetchText(rawUrl(candidate.row.text_path));
      const sectionExcerpt = sectionAwareExcerpt(text, phrases);
      return {
        ...candidate,
        text,
        textScore: sectionExcerpt.score,
        sectionExcerpt: sectionExcerpt.excerpt,
        provisions: sectionExcerpt.provisions,
      } as FetchedRow & { sectionExcerpt: string; provisions: string[] };
    } catch (error) {
      console.warn("legal source fetch skipped", candidate.row.short_id, error);
      return null;
    }
  }));

  const limit = Math.min(options.maxResults ?? MAX_RESULTS, MAX_RESULTS);
  return fetched
    .filter((item): item is FetchedRow & { sectionExcerpt: string; provisions: string[] } => Boolean(item))
    .sort((a, b) => (b.textScore + b.score) - (a.textScore + a.score))
    .filter((item) => item.textScore > 0 || item.score > 0)
    .slice(0, limit)
    .map(({ row, text, textScore: score, authorityTypes, sectionExcerpt, provisions }) => ({
      shortId: row.short_id,
      title: row.title,
      year: row.year,
      sourcePath: row.original_source_path,
      textPath: row.text_path,
      authorityTypes: authorityTypes.length > 0 ? authorityTypes : ["statutory source"],
      matchStrength: score >= 6 ? "strong" : "moderate",
      provisions,
      excerpt: sectionExcerpt || excerptAroundTerms(text, phrases),
    }));
}

export function formatLegalSources(sources: LegalSource[]): string {
  if (sources.length === 0) return "";
  return sources.map((source, index) => [
    `[Legal source ${index + 1} — ${source.matchStrength} match] ${source.title}${source.year ? ` (${source.year})` : ""}`,
    `Authority area(s): ${source.authorityTypes.join("; ")}`,
    `Provision(s) returned: ${source.provisions.length > 0 ? source.provisions.join(", ") : "section marker not detected"}`,
    `Source file: ${source.sourcePath}`,
    `GitHub text path: ${source.textPath}`,
    source.excerpt,
  ].join("\n")).join("\n\n---\n\n");
}
