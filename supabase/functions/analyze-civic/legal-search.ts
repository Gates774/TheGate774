// GitHub-only legal source retrieval for THE GATE®.
// This helper does not use Supabase tables and does not modify civic_guide.ts.
// It reads the public legal-text library from the feature branch and returns
// only a small number of relevant excerpts for the existing AI prompt.

const LEGAL_REPO_OWNER = "Gates774";
const LEGAL_REPO_NAME = "TheGate774";
const LEGAL_BRANCH = "feature/legal-law-retrieval";
const METADATA_PATH = "laws/metadata_github.csv";

const MAX_CANDIDATES = 8;
const MAX_RESULTS = 4;
const MAX_EXCERPT_CHARS = 6000;
const REQUEST_TIMEOUT_MS = 7000;

export type LegalSource = {
  shortId: string;
  title: string;
  year: string;
  sourcePath: string;
  textPath: string;
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

let metadataPromise: Promise<MetadataRow[]> | undefined;

function rawUrl(path: string): string {
  const safePath = path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `https://raw.githubusercontent.com/${LEGAL_REPO_OWNER}/${LEGAL_REPO_NAME}/${LEGAL_BRANCH}/${safePath}`;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
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

function termsFor(query: string): string[] {
  return [...new Set(normalize(query)
    .split(" ")
    .filter((term) => term.length >= 3))];
}

function metadataScore(row: MetadataRow, terms: string[]): number {
  const title = normalize(row.title);
  const source = normalize(row.original_source_path);
  const combined = `${title} ${source}`;
  let score = 0;
  for (const term of terms) {
    if (title.includes(term)) score += 8;
    else if (source.includes(term)) score += 5;
    else if (combined.includes(term)) score += 1;
  }
  return score;
}

function textScore(text: string, terms: string[]): number {
  const normalized = normalize(text);
  return terms.reduce((score, term) => {
    const matches = normalized.match(new RegExp(`\\b${term.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`, "g"));
    return score + Math.min(matches?.length ?? 0, 8);
  }, 0);
}

function excerptAroundTerms(text: string, terms: string[]): string {
  const clean = text.replace(/\0/g, "").trim();
  if (clean.length <= MAX_EXCERPT_CHARS) return clean;

  const normalized = normalize(clean);
  const firstTerm = terms.find((term) => normalized.includes(term));
  const position = firstTerm ? normalized.indexOf(firstTerm) : 0;
  const start = Math.max(0, Math.min(position - 1200, clean.length - MAX_EXCERPT_CHARS));
  return clean.slice(start, start + MAX_EXCERPT_CHARS).trim();
}

export async function searchLegalSources(
  query: string,
  options: { maxResults?: number } = {},
): Promise<LegalSource[]> {
  const terms = termsFor(query);
  if (terms.length === 0) return [];

  if (!metadataPromise) {
    metadataPromise = loadMetadata().catch((error) => {
      metadataPromise = undefined;
      throw error;
    });
  }

  const metadata = await metadataPromise;
  const candidates = metadata
    .map((row) => ({ row, score: metadataScore(row, terms) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CANDIDATES)
    .map(({ row }) => row);

  const fetched = await Promise.all(candidates.map(async (row) => {
    try {
      const text = await fetchText(rawUrl(row.text_path));
      return { row, text, score: textScore(text, terms) };
    } catch (error) {
      console.warn("legal source fetch skipped", row.short_id, error);
      return null;
    }
  }));

  const limit = Math.min(options.maxResults ?? MAX_RESULTS, MAX_RESULTS);
  return fetched
    .filter((item): item is { row: MetadataRow; text: string; score: number } => Boolean(item))
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score > 0 || metadataScore(item.row, terms) > 0)
    .slice(0, limit)
    .map(({ row, text }) => ({
      shortId: row.short_id,
      title: row.title,
      year: row.year,
      sourcePath: row.original_source_path,
      textPath: row.text_path,
      excerpt: excerptAroundTerms(text, terms),
    }));
}

export function formatLegalSources(sources: LegalSource[]): string {
  if (sources.length === 0) return "";
  return sources.map((source, index) => [
    `[Legal source ${index + 1}] ${source.title}${source.year ? ` (${source.year})` : ""}`,
    `Source file: ${source.sourcePath}`,
    `GitHub text path: ${source.textPath}`,
    source.excerpt,
  ].join("\n")).join("\n\n---\n\n");
}
