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
  Printer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import gate774Logo from "@/assets/gate774-logo.png.asset.json";

/**
 * THE GATE® — Civic Action Brief
 *
 * This component is presentation-only. All retrieval (legal sources, MDA
 * directory lookups) happens server-side in the `analyze-civic` edge
 * function and `legal-search.ts`. This file must never re-implement that
 * fetching/parsing logic — it only renders whatever `analysis` it is given.
 */

export interface ComplaintAnalysis {
  tier?: "federal" | "state" | "local";
  level?: string;
  category?: string;
  issue_summary?: string;
  responsible_authority?: { name?: string; tier?: string; officer?: string };
  mda?: string;
  contact?: string;
  submission_destination?: {
    institution?: string;
    website?: string | null;
    address_contact?: string | null;
    why_relevant?: string;
    verification_note?: string;
  };
  other_relevant_authorities?: Array<{
    institution?: string;
    website?: string | null;
    address_contact?: string | null;
    condition?: string;
    verification_note?: string;
  }>;
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

/** Extract a labelled segment (e.g. "Website: ...") from the compact MDA submission block returned in analysis.mda. */
function extractMdaField(value: string | undefined, labels: string[]): string | undefined {
  if (!value) return undefined;
  const escapedLabels = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const labelPattern = escapedLabels.join("|");
  const match = value.match(new RegExp(`(?:^|[;\\n])\\s*(?:${labelPattern})\\s*[:\\u2014-]\\s*([^;\\n]+)`, "i"));
  return match?.[1]?.trim() || undefined;
}

function isWebsite(value: string | undefined): boolean {
  return Boolean(value && /^(?:https?:\/\/)?(?:www\.)?[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:\/[^\s]*)?$/i.test(value.trim()));
}

function extractMdaAddressContact(analysis: ComplaintAnalysis): string | undefined {
  const labelled = extractMdaField(analysis.mda, ["Address / Contact", "Address", "Contact"])
    ?? extractMdaField(analysis.contact, ["Address / Contact", "Address", "Contact"]);
  if (labelled) return labelled;

  // Parse only the MDA/contact values. Never infer an address from legal rationale text.
  const block = [analysis.mda, analysis.contact].filter(Boolean).join("\n");
  const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const websitePattern = /(?:https?:\/\/)?(?:www\.)?[A-Za-z0-9.-]+\.(?:gov\.ng|org|com|net|ng)\b/i;

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(websitePattern);
    if (!match) continue;
    const sameLine = lines[index].slice((match.index ?? 0) + match[0].length)
      .replace(/^\s*\[V\]\s*/i, "")
      .replace(/^\s*[|—-]\s*/, "")
      .trim();
    if (sameLine.length >= 6 && !/^directory source/i.test(sameLine)) return sameLine;

    const nextLine = lines[index + 1];
    if (nextLine && !/^directory source|^website|^institution/i.test(nextLine)) return nextLine;
  }

  return undefined;
}

/**
 * The backend appends an "MDA SUBMISSION DESTINATION" block onto the end of
 * `analysis.rationale` (see analyze-civic/index.ts, appendSection calls).
 * That block is already rendered in full, once, in the dedicated
 * "Where to submit this report" section below. To keep the MDA institution
 * from appearing a third time, this strips everything from that heading
 * onward before the rationale is shown as the legal-provisions narrative.
 */
function legalRationaleOnly(rationale?: string): string | undefined {
  if (!rationale) return undefined;

  // Remove legacy appended submission blocks from already-generated responses.
  const cutIndex = rationale.search(/\n{1,2}(?:MDA SUBMISSION DESTINATION|WHERE TO SUBMIT THIS REPORT)\b/i);
  const trimmed = (cutIndex >= 0 ? rationale.slice(0, cutIndex) : rationale)
    .replace(/^RETRIEVED LEGAL PROVISIONS\s*\n+/i, "")
    .trim();

  // The backend requests plain text, but older responses may contain Markdown
  // emphasis. Remove the markers while preserving the wording and line breaks.
  const cleanText = trimmed
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*#{1,6}\s+/gm, "")
    .trim();

  return cleanText || undefined;
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

  // Resolved once, reused everywhere — this is the single source of truth
  // for MDA fields, so the institution can only ever appear in the two
  // places this component deliberately renders it (the "Route to" line and
  // the "Where to submit" section), never a third time.
  const destination = analysis.submission_destination;
  const primaryInstitution = destination?.institution
    ?? extractMdaField(analysis.mda, ["Primary institution", "Institution"]);
  const primaryWebsite = destination?.website
    ?? extractMdaField(analysis.mda, ["Website"])
    ?? (isWebsite(analysis.contact) ? analysis.contact : undefined);
  const primaryAddress = destination?.address_contact
    ?? extractMdaAddressContact(analysis);
  const hasSubmissionInfo = Boolean(primaryInstitution || primaryWebsite || primaryAddress);
  const legalRationale = legalRationaleOnly(analysis.rationale);

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

      {/* Route-to line — MDA mention #1 of 2: a short addressee reference, like the
          "To:" line on a formal letter. Full details live in Section 03 below. */}
      {primaryInstitution && (
        <div className="border-b border-foreground/15 bg-foreground/[0.025] px-4 sm:px-10 py-3 flex items-center gap-2.5 print-break-inside-avoid">
          <Building2 className="h-3.5 w-3.5 text-foreground/55 shrink-0" strokeWidth={1.75} />
          <span className="text-[10px] uppercase tracking-[0.2em] text-foreground/55 font-semibold shrink-0">Route to</span>
          <span className="text-[13px] sm:text-[14px] font-semibold text-foreground truncate">{primaryInstitution}</span>
        </div>
      )}

      {/* Body grid */}
      <div className="px-4 sm:px-10 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {(analysis.confidence || analysis.category) && (
          <div className="flex flex-wrap items-center justify-between gap-2 -mt-2">
            <span className="text-[10px] uppercase tracking-[0.24em] text-foreground/55 font-semibold">
              {analysis.category ?? "Civic Action Brief"}
            </span>
            {analysis.confidence && (
              <Badge variant="outline" className="rounded-sm text-[10px] uppercase tracking-[0.16em] border-foreground/30">
                {analysis.confidence} confidence
              </Badge>
            )}
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
          <p className="text-[14px] sm:text-[15px] leading-[1.7] sm:leading-[1.75] text-foreground/90 break-words">
            {analysis.issue_summary ?? legalRationale ?? "—"}
          </p>
        </Section>

        {legalRationale && (
          <Section label="02 — Retrieved legal provisions" icon={ScrollText}>
            <div className="rounded-sm border border-foreground/15 bg-foreground/[0.02] px-4 py-3.5 sm:px-5 sm:py-4 print-break-inside-avoid">
              <p className="text-[13px] sm:text-[14px] leading-[1.75] text-foreground/90 whitespace-pre-wrap">
                {legalRationale}
              </p>
            </div>
          </Section>
        )}

        {/* MDA mention #2 of 2 — the only place full institution details are shown. */}
        {hasSubmissionInfo && (
          <Section label="03 — Where to submit this report" icon={Building2}>
            <div>
              <div className="rounded-sm border border-foreground/15 bg-foreground/[0.025] p-4 sm:p-5 print-break-inside-avoid">
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-[10.5px] uppercase tracking-[0.18em] text-foreground/50 font-semibold mb-1">Institution</dt>
                      <dd className="text-[13px] sm:text-[14px] leading-[1.7] text-foreground/90 whitespace-pre-wrap font-medium">{primaryInstitution || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[10.5px] uppercase tracking-[0.18em] text-foreground/50 font-semibold mb-1">Website</dt>
                      <dd className="text-[13px] sm:text-[14px] leading-[1.7] text-foreground/90 whitespace-pre-wrap break-words">{primaryWebsite || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[10.5px] uppercase tracking-[0.18em] text-foreground/50 font-semibold mb-1">Address / Contact</dt>
                      <dd className="text-[13px] sm:text-[14px] leading-[1.7] text-foreground/90 whitespace-pre-wrap break-words">{primaryAddress || "—"}</dd>
                    </div>
                  </dl>
                  {destination?.why_relevant && (
                    <p className="mt-4 pt-4 border-t border-foreground/10 text-[13px] leading-[1.7] text-foreground/80">
                      {destination.why_relevant}
                    </p>
                  )}
              </div>
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
