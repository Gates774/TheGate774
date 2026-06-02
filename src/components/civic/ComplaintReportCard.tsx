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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface ComplaintAnalysis {
  tier?: "federal" | "state" | "local";
  level?: string;
  issue_summary?: string;
  responsible_authority?: { name?: string; tier?: string; officer?: string };
  mda?: string;
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
}

const TIER_META = {
  federal: { label: "Federal Government", icon: Landmark, accent: "Federal" },
  state: { label: "State Government", icon: Building2, accent: "State" },
  local: { label: "Local Government Area", icon: MapPin, accent: "LGA" },
} as const;

export function ComplaintReportCard({
  analysis,
  eyebrow = "Your Complaint Report",
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

  return (
    <article className="relative overflow-hidden rounded-3xl border border-border bg-card animate-slide-up">
      {/* Letterhead */}
      <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-border/60 flex items-start gap-4 bg-gradient-to-br from-secondary/40 to-card">
        <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-civic shrink-0">
          <Icon className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground font-medium">{eyebrow}</span>
            {analysis.confidence && (
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                {analysis.confidence} confidence
              </Badge>
            )}
          </div>
          <h2 className="font-heading text-xl sm:text-2xl font-semibold leading-tight">{authority}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Responsible tier · <span className="text-foreground font-medium">{meta.label}</span>
          </p>
        </div>
      </div>

      {/* Body grid */}
      <div className="p-6 sm:p-8 space-y-7">
        {analysis.empathy_note && (
          <p className="text-[15px] leading-relaxed italic text-foreground/85 border-l-2 border-primary/40 pl-4">
            {analysis.empathy_note}
          </p>
        )}

        {analysis.out_of_scope && (
          <div className="flex gap-3 p-4 rounded-xl border border-warning/30 bg-warning/5 text-sm">
            <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" strokeWidth={1.75} />
            <p className="text-foreground/85 leading-relaxed">
              This issue falls outside the Civic Action Guide. The steps below still point you to the furthest actionable path.
            </p>
          </div>
        )}

        <Section label="Issue summary" icon={ScrollText}>
          <p className="text-[15px] leading-relaxed">{analysis.issue_summary ?? analysis.rationale ?? "—"}</p>
        </Section>

        <div className="grid sm:grid-cols-2 gap-4">
          <MetaTile label="Responsible body" value={authority} />
          <MetaTile label="Accountable officer" value={officer} />
          <MetaTile label="Tier of government" value={meta.label} />
          <MetaTile label="Constitutional basis" value={analysis.constitutional_basis ?? "—"} />
        </div>

        {steps.length > 0 && (
          <Section label="What to do next" icon={CheckCircle2}>
            <ol className="space-y-2.5">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
                  <span className="shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {analysis.documents_needed && analysis.documents_needed.length > 0 && (
          <Section label="Documents to prepare" icon={FileCheck2}>
            <ul className="grid sm:grid-cols-2 gap-2">
              {analysis.documents_needed.map((d) => (
                <li key={d} className="flex items-start gap-2 text-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {analysis.escalation_path && analysis.escalation_path.length > 0 && (
          <Section label="If you are ignored, escalate to" icon={ArrowUpRight}>
            <ol className="space-y-1.5">
              {analysis.escalation_path.map((e, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <span>{e}</span>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {analysis.rights_reminder && (
          <div className="flex gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15">
            <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" strokeWidth={1.75} />
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-primary font-semibold mb-1">Your right</div>
              <p className="text-sm leading-relaxed text-foreground/90">{analysis.rights_reminder}</p>
            </div>
          </div>
        )}
      </div>
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
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-primary" strokeWidth={1.75} />
        <h3 className="text-[11px] uppercase tracking-[0.18em] font-semibold text-muted-foreground">{label}</h3>
      </div>
      {children}
    </section>
  );
}

function MetaTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-xl border border-border/70 bg-muted/30">
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-medium mb-1">{label}</div>
      <div className="text-sm font-medium text-foreground leading-snug">{value}</div>
    </div>
  );
}