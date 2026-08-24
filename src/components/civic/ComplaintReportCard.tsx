import {
  Landmark,
  Building2,
  MapPin,
  ScrollText,
  CheckCircle2,
  FileCheck2,
  ArrowUpRight,
  Shield,
  AlertCircle,
  Link2,
  HelpCircle,
  Printer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import gate774Logo from "@/assets/gate774-logo.png.asset.json";


export interface ComplaintAnalysis {
  tier?: "federal" | "state" | "local";
  level?: string;
  issue_summary?: string;
  responsible_authority?: { name?: string; tier?: string; officer?: string };
  mda?: string;
  contact?: string;
  officer?: string;
  constitutional_basis?: string;
  action_plan?: string[];
  next_steps?: string[];
  documents_needed?: string[];
  escalation_path?: string[];
  rights_reminder?: string;
  rationale?: string;
  empathy_note?: string;
  out_of_scope?: boolean;
  confidence?: "high" | "medium" | "low";
  /** Official authorities / publications cited as the source for this answer. */
  sources?: Array<{ name: string; url?: string }>;
  /** Suggested follow-up questions the user might want to ask next. */
  follow_ups?: string[];
}


// GitHub-only legal source retrieval for THE GATE®.
// This helper does not use Supabase tables and does not modify civic_guide.ts.
// It reads the public legal-text library from the feature branch and returns
// bounded, source-labelled excerpts for the existing AI prompt.

const LEGAL_REPO_OWNER = "Gates774";
const LEGAL_REPO_NAME = "TheGate774";
const LEGAL_BRANCH = "main";
const METADATA_PATH = "laws/metadata_github.csv";
const MDA_DIRECTORY_PATH = "laws/mda/nigeria-mda-directory.txt";
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
  website: string;
  addressContact: string;
  category: string;
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
  const rowPattern = /^\s*(.*?)\s{2,}((?:https?:\/\/)?[A-Za-z0-9.-]+\.(?:gov\.ng|org|com|net|ng)|—)\s{2,}(.*?)\s*$/;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trimEnd();
    const heading = line.match(/^\s*(\d{1,2})\.\s+(.+)$/);
    if (heading && !/^\d+\.$/.test(heading[2].trim())) category = heading[2].trim();
    const match = line.match(rowPattern);
    if (!match) continue;
    let institution = match[1].replace(/\s+/g, " ").trim();
    const website = match[2].trim();
    const addressContact = match[3].replace(/\s+/g, " ").trim();

    // The PDF conversion wraps long institution names onto the next line.
    // Join those continuation lines so the report receives the complete name.
    let continuationIndex = index + 1;
    while (continuationIndex < lines.length) {
      const continuation = lines[continuationIndex].trim();
      if (!continuation || /^(?:NIGERIA|Compiled|Institution|Website|Address \/ Contact)/i.test(continuation)) break;
      if (/^\d{1,2}\.\s+/.test(continuation) || rowPattern.test(lines[continuationIndex])) break;
      if (/^(?:(?:[A-Z][A-Za-z&'().-]*)|(?:\([^)]+\)))(?:\s+(?:(?:[A-Z][A-Za-z&'().-]*)|(?:\([^)]+\)))){0,8}$/.test(continuation)) {
        institution = `${institution} ${continuation}`.replace(/\s+/g, " ").trim();
        continuationIndex += 1;
        continue;
      }
      break;
    }

    if (!institution || institution.toLowerCase() === "institution") continue;
    rows.push({ institution, website, addressContact, category, lineIndex: index });
  }

  return rows;
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

  return matches.map(({ row, score }) => {
    const excerpt = lines.slice(Math.max(0, row.lineIndex - 1), Math.min(lines.length, row.lineIndex + 4)).join("\n").trim();
    return {
      institution: row.institution,
      website: row.website,
      addressContact: row.addressContact,
      category: row.category,
      sourcePath: MDA_DIRECTORY_PATH,
      matchStrength: score >= 5 ? "strong" : "moderate",
      excerpt: excerpt.slice(0, 2400),
    };
  });
}

export function formatMdaSources(sources: MdaSource[]): string {
  if (sources.length === 0) return "";
  return sources.map((source, index) => [
    `[MDA source ${index + 1} — ${source.matchStrength} match] ${source.institution}`,
    `Category: ${source.category || "Not specified in directory"}`,
    `Website: ${source.website === "—" ? "Not listed" : source.website}`,
    `Address / Contact: ${source.addressContact || "Not listed"}`,
    `Directory source: ${source.sourcePath}`,
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


const logo = gate774Logo.url;

const TIER_META = {
  federal: { label: "Federal Republic of Nigeria", short: "Federal", icon: Landmark },
  state: { label: "State Government", short: "State", icon: Building2 },
  local: { label: "Local Government Area", short: "LGA", icon: MapPin },
} as const;

function makeRef(tier: string) {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const rand = Math.floor(1000 + Math.random() * 9000);
  const code = tier === "federal" ? "FG" : tier === "state" ? "SG" : "LG";
  return `THE GATE®/${code}/${yy}/${rand}`;
}

function formatToday() {
  return new Date().toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Extract a labelled segment (e.g. "Website: ...") from the compact MDA submission block returned in analysis.mda. Returns undefined when the label is absent. */
function extractMdaField(value: string | undefined, labels: string[]): string | undefined {
  if (!value) return undefined;
  const escapedLabels = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const labelPattern = escapedLabels.join("|");
  const match = value.match(new RegExp(`(?:^|[;\\n])\\s*(?:${labelPattern})\\s*[:\\u2014-]\\s*([^;\\n]+)`, "i"));
  return match?.[1]?.trim() || undefined;
}

function extractMdaAddressContact(analysis: ComplaintAnalysis): string | undefined {
  const labelled = extractMdaField(analysis.mda, ["Address / Contact", "Address", "Contact"])
    ?? extractMdaField(analysis.contact, ["Address / Contact", "Address", "Contact"])
    ?? extractMdaField(analysis.rationale, ["Address / Contact", "Address", "Contact"]);
  if (labelled) return labelled;

  const combined = [analysis.mda, analysis.contact, analysis.rationale].filter(Boolean).join("\n");
  const addressLine = combined.match(/(?:HQ|Headquarters|Office|Plot|Block|House|Street|Road|Avenue|Crescent|Complex|Secretariat|PMB|Abuja|Lagos)[^\n;]{5,}/i);
  return addressLine?.[0]?.trim() || undefined;
}

export function ComplaintReportCard({
  analysis,
  eyebrow = "Civic Action Brief",
}: {
  analysis: ComplaintAnalysis;
  eyebrow?: string;
}) {
  const tier = (analysis.tier as keyof typeof TIER_META) ?? "state";
  const meta = TIER_META[tier] ?? TIER_META.state;
  const Icon = meta.icon;
  const steps = analysis.action_plan?.length ? analysis.action_plan : analysis.next_steps ?? [];
  const authority = analysis.responsible_authority?.name ?? analysis.mda ?? "Responsible authority";
  const officer = analysis.responsible_authority?.officer ?? analysis.officer ?? "—";
  const refNo = makeRef(tier);
  const issued = formatToday();

  const handleExport = () => {
    if (typeof document === "undefined") return;
    const prev = document.title;
    document.title = `THE GATE - ${eyebrow} - ${refNo}`;
    window.print();
    setTimeout(() => {
      document.title = prev;
    }, 500);
  };

  return (
    <article className="print-root relative overflow-hidden rounded-sm border border-foreground/15 bg-card shadow-[0_1px_0_hsl(var(--foreground)/0.04),0_24px_60px_-30px_hsl(var(--foreground)/0.25)] animate-slide-up print:shadow-none">
      {/* Export action — hidden in print */}
      <div className="no-print absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
        <Button
          size="sm"
          variant="outline"
          onClick={handleExport}
          className="h-8 rounded-sm gap-1.5 text-[11px] uppercase tracking-[0.16em] font-semibold border-foreground/25 bg-card/80 backdrop-blur"
        >
          <Printer className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span className="hidden sm:inline">Export PDF</span>
          <span className="sm:hidden">PDF</span>
        </Button>
      </div>

      {/* Official letterhead */}
      <header className="relative border-b-2 border-foreground/80">
        {/* twin top rules */}
        <div className="absolute top-0 inset-x-0 h-[3px] bg-foreground/80" />
        <div className="absolute top-[5px] inset-x-0 h-px bg-foreground/40" />

        <div className="px-4 sm:px-10 pt-7 pb-5">
          {/* Brand strip */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <img
              src={logo}
              alt="THE GATE"
              className="h-7 w-auto object-contain"
              loading="lazy"
            />
            <span className="text-[10px] tracking-[0.3em] uppercase text-foreground/60 font-semibold">
              THE GATE®
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full border-2 border-foreground/80 bg-card flex items-center justify-center shrink-0">
              <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-foreground" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0 text-center">
              <div className="text-[10px] tracking-[0.28em] sm:tracking-[0.32em] uppercase text-foreground/60 font-semibold">
                {meta.label}
              </div>
              <h2 className="font-heading text-xl sm:text-[28px] font-bold leading-tight tracking-tight mt-1 break-words">
                {authority}
              </h2>
              <div className="mt-2 text-[10px] sm:text-[11px] tracking-[0.18em] sm:tracking-[0.22em] uppercase text-foreground/55">
                Office of the {meta.short === "LGA" ? "Chairman" : meta.short === "State" ? "Governor" : "President"}
              </div>
            </div>
            <div className="hidden sm:block h-14 w-14 shrink-0" aria-hidden />
          </div>

          {/* Brief meta strip */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-0 text-[10px] uppercase tracking-[0.18em] text-foreground/55 border-t border-foreground/15 pt-3">
            <div className="text-left">
              <div className="font-semibold text-foreground/70">Ref. No.</div>
              <div className="mt-0.5 font-mono text-[11px] tracking-normal normal-case text-foreground break-all">{refNo}</div>
            </div>
            <div className="text-left sm:text-center">
              <div className="font-semibold text-foreground/70">Document</div>
              <div className="mt-0.5 text-[11px] tracking-normal normal-case text-foreground">{eyebrow}</div>
            </div>
            <div className="text-left sm:text-right">
              <div className="font-semibold text-foreground/70">Issued</div>
              <div className="mt-0.5 text-[11px] tracking-normal normal-case text-foreground">{issued}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Body grid */}
      <div className="px-4 sm:px-10 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {analysis.confidence && (
          <div className="flex items-center justify-between gap-3 -mt-2">
            <span className="text-[10px] uppercase tracking-[0.24em] text-foreground/55 font-semibold">
              Civic Action Brief
            </span>
            <Badge variant="outline" className="rounded-sm text-[10px] uppercase tracking-[0.16em] border-foreground/30">
              {analysis.confidence} confidence
            </Badge>
          </div>
        )}

        {analysis.empathy_note && (
          <p className="font-heading text-[15px] sm:text-[17px] leading-relaxed italic text-foreground/85 border-l-[3px] border-foreground/70 pl-3 sm:pl-4 print-break-inside-avoid">
            {analysis.empathy_note}
          </p>
        )}

        {analysis.out_of_scope && (
          <div className="flex gap-3 p-4 rounded-sm border-l-2 border-warning bg-warning/5 text-sm">
            <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" strokeWidth={1.5} />
            <p className="text-foreground/85 leading-relaxed">
              This issue falls outside the Civic Action Guide. The steps below still point you to the furthest actionable path.
            </p>
          </div>
        )}

        <Section label="01 — Subject of the matter" icon={ScrollText}>
          <p className="text-[14px] sm:text-[15px] leading-[1.7] sm:leading-[1.75] text-foreground/90 break-words">{analysis.issue_summary ?? analysis.rationale ?? "—"}</p>
        </Section>

        {analysis.rationale && (
          <Section label="02 — Retrieved legal provisions" icon={ScrollText}>
            <p className="text-[13px] sm:text-[14px] leading-[1.7] text-foreground/90 whitespace-pre-wrap">{analysis.rationale}</p>
          </Section>
        )}

        {(analysis.mda || analysis.contact || analysis.rationale) && (
          <Section label="03 — Where to submit this report" icon={Building2}>
            <div className="space-y-4">
              {(analysis.mda || analysis.contact) && (() => {
                const institution = extractMdaField(analysis.mda, ["Primary institution", "Institution"]);
                const website = extractMdaField(analysis.mda, ["Website"]) ?? analysis.contact;
                const address = extractMdaAddressContact(analysis);
                return (
                  <dl className="space-y-3">
                    {institution && (
                      <div>
                        <dt className="text-[10.5px] uppercase tracking-[0.18em] text-foreground/50 font-semibold mb-1">Institution</dt>
                        <dd className="text-[13px] sm:text-[14px] leading-[1.7] text-foreground/90 whitespace-pre-wrap">{institution}</dd>
                      </div>
                    )}
                    {website && (
                      <div>
                        <dt className="text-[10.5px] uppercase tracking-[0.18em] text-foreground/50 font-semibold mb-1">Website</dt>
                        <dd className="text-[13px] sm:text-[14px] leading-[1.7] text-foreground/90 whitespace-pre-wrap break-words">{website}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-[10.5px] uppercase tracking-[0.18em] text-foreground/50 font-semibold mb-1">Address / Contact</dt>
                      <dd className="text-[13px] sm:text-[14px] leading-[1.7] text-foreground/90 whitespace-pre-wrap break-words">
                        {address ?? "Not provided in the returned analysis data."}
                      </dd>
                    </div>
                  </dl>
                );
              })()}
              {analysis.mda && (
                <div>
                  <p className="text-[10.5px] uppercase tracking-[0.18em] text-foreground/50 font-semibold mb-1">Full MDA directory entry</p>
                  <p className="text-[13px] sm:text-[14px] leading-[1.7] text-foreground/90 whitespace-pre-wrap">{analysis.mda}</p>
                </div>
              )}
              {!analysis.mda && !analysis.contact && analysis.rationale && (
                <p className="text-[13px] sm:text-[14px] leading-[1.7] text-foreground/90 whitespace-pre-wrap">{analysis.rationale}</p>
              )}
              {(analysis.mda || analysis.contact) && (
                <p className="text-[12px] sm:text-[13px] leading-[1.6] text-foreground/60">
                  Directory source: Nigerian MDA directory.
                </p>
              )}
              <p className="text-[12px] sm:text-[13px] leading-[1.6] text-foreground/60 italic">
                Verify the current submission channel and address on the institution's official website before sending any physical or electronic report.
              </p>
            </div>
          </Section>
        )}

        <Section label="04 — Responsible authority" icon={Landmark}>
          <dl className="divide-y divide-foreground/10 border-y border-foreground/10">
            <Row label="Responsible body" value={authority} />
            <Row label="Accountable officer" value={officer} />
            <Row label="Tier of government" value={meta.label} />
            <Row label="Constitutional basis" value={analysis.constitutional_basis ?? "—"} mono />
          </dl>
        </Section>

        {steps.length > 0 && (
          <Section label="05 — Recommended course of action" icon={CheckCircle2}>
            <ol className="space-y-3 sm:space-y-4">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-3 sm:gap-4 text-[14px] sm:text-[15px] leading-[1.7] print-break-inside-avoid">
                  <span className="shrink-0 font-heading font-bold text-foreground/40 text-base sm:text-lg tabular-nums w-6 sm:w-7 pt-0.5">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-foreground/90 border-l border-foreground/10 pl-3 sm:pl-4 break-words min-w-0">{s}</span>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {analysis.documents_needed && analysis.documents_needed.length > 0 && (
          <Section label="06 — Documents to prepare" icon={FileCheck2}>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {analysis.documents_needed.map((d) => (
                <li key={d} className="flex items-start gap-3 text-[14px] leading-relaxed py-1 border-b border-dashed border-foreground/10">
                  <span className="text-foreground/40 text-xs mt-1 shrink-0">▢</span>
                  <span className="text-foreground/85 break-words min-w-0">{d}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {analysis.escalation_path && analysis.escalation_path.length > 0 && (
          <Section label="07 — Escalation pathway" icon={ArrowUpRight}>
            <ol className="space-y-2 border-l border-foreground/15 pl-4 sm:pl-5">
              {analysis.escalation_path.map((e, i) => (
                <li key={i} className="relative text-[13.5px] sm:text-[14px] leading-relaxed text-foreground/85 break-words">
                  <span className="absolute -left-[22px] sm:-left-[27px] top-1.5 h-2 w-2 rounded-full bg-card border-2 border-foreground/60" />
                  <span className="font-mono text-[11px] text-foreground/50 mr-2">{String(i + 1).padStart(2, "0")}</span>
                  {e}
                </li>
              ))}
            </ol>
          </Section>
        )}

        {analysis.rights_reminder && (
          <div className="relative p-4 sm:p-6 bg-foreground/[0.03] border-l-[3px] border-foreground/70 print-break-inside-avoid">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-foreground/70" strokeWidth={1.5} />
              <div className="text-[10px] uppercase tracking-[0.24em] text-foreground/60 font-bold">Citizen's right</div>
            </div>
            <p className="text-[14px] sm:text-[14.5px] leading-[1.7] text-foreground/90 break-words">{analysis.rights_reminder}</p>
          </div>
        )}

        {analysis.sources && analysis.sources.length > 0 && (
          <Section label="08 — Source authorities" icon={Link2}>
            <ul className="space-y-1.5">
              {analysis.sources.map((s, i) => (
                <li key={i} className="text-[13px] flex items-start gap-3 text-foreground/75">
                  <span className="font-mono text-[11px] text-foreground/45 mt-0.5">[{i + 1}]</span>
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground break-all"
                    >
                      {s.name}
                    </a>
                  ) : (
                    <span className="break-words min-w-0">{s.name}</span>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      {/* Official footer */}
      <footer className="border-t border-foreground/15 px-4 sm:px-10 py-4 bg-foreground/[0.02] flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.22em] text-foreground/55">
        <span className="flex items-center gap-2">
          <img src={logo} alt="" className="h-4 w-auto object-contain" />
          Issued by THE GATE®
        </span>
        <span className="font-mono normal-case tracking-normal text-foreground/45 break-all">{refNo}</span>
        <span>THE GATE® Civic Report</span>
      </footer>
    </article>
  );
}

function Section({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: typeof ScrollText;
  children: React.ReactNode;
}) {
  return (
    <section>
      <header className="flex items-center gap-3 mb-4 pb-2 border-b border-foreground/15">
        <Icon className="h-3.5 w-3.5 text-foreground/55" strokeWidth={1.5} />
        <h3 className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.26em] font-bold text-foreground/75">{label}</h3>
        <span className="flex-1 h-px bg-foreground/10" />
      </header>
      {children}
    </section>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1 sm:gap-4 py-3">
      <dt className="text-[10px] uppercase tracking-[0.18em] sm:tracking-[0.2em] text-foreground/55 font-semibold pt-0.5">{label}</dt>
      <dd className={`text-[14px] sm:text-[14.5px] text-foreground leading-snug break-words ${mono ? "font-mono text-[12.5px] sm:text-[13px]" : "font-medium"}`}>{value}</dd>
    </div>
  );
}

