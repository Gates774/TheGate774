import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  Loader2,
  Send,
  RotateCcw,
  Gavel,
  Banknote,
  Pill,
  PackageX,
  ShieldAlert,
  Vote,
  HeartCrack,
  Users,
  Leaf,
  Laptop,
  Check,
  ShieldCheck,
  Copy,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { ModuleHeader } from "@/components/civic/ModuleHeader";
import { ModuleFooter } from "@/components/civic/ModuleFooter";
import { ComplaintReportCard, type ComplaintAnalysis } from "@/components/civic/ComplaintReportCard";
import { StepCarousel } from "@/components/civic/StepCarousel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ReportEvidenceUploader } from "@/components/civic/ReportEvidenceUploader";
import { REPORTING_CATEGORIES } from "@/data/reportingCategories";
import { NIGERIA_LGAS } from "@/data/nigeriaLgas";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const ICONS = {
  corruption: Gavel,
  financial: Banknote,
  drugs: Pill,
  standards: PackageX,
  police: ShieldAlert,
  election: Vote,
  "human-rights": HeartCrack,
  trafficking: Users,
  environment: Leaf,
  cyber: Laptop,
} as const;

export default function Reporting() {
  const [categoryId, setCategoryId] = useState<string>("");
  const [subId, setSubId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [residenceState, setResidenceState] = useState<string>("");
  const [residenceLga, setResidenceLga] = useState<string>("");
  const [anonymous, setAnonymous] = useState(true);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [evidence, setEvidence] = useState<string[]>([]);
  const [folder] = useState(() => `pending-${crypto.randomUUID()}`);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ComplaintAnalysis | null>(null);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  const category = useMemo(
    () => REPORTING_CATEGORIES.find((c) => c.id === categoryId) ?? null,
    [categoryId],
  );
  const subcategory = useMemo(
    () => category?.subcategories.find((s) => s.id === subId) ?? null,
    [category, subId],
  );
  const states = Object.keys(NIGERIA_LGAS);
  const lgas = residenceState ? NIGERIA_LGAS[residenceState] ?? [] : [];

  const canSubmit =
    Boolean(category && subcategory) &&
    description.trim().length >= 10 &&
    !loading &&
    (anonymous || (fullName.trim().length > 0 && phone.trim().length > 0));

  const reset = () => {
    setAnalysis(null);
    setTrackingCode(null);
    setCategoryId("");
    setSubId("");
    setDescription("");
    setEvidence([]);
    setFullName("");
    setPhone("");
    setStep(0);
  };

  const submit = async () => {
    if (!category || !subcategory) {
      toast.error("Please choose a category and a specific offence.");
      return;
    }
    if (description.trim().length < 10) {
      toast.error("Add a short description of what happened (10+ characters).");
      return;
    }
    setLoading(true);
    setAnalysis(null);

    const content = [
      `Offence reported: ${subcategory.label} (${category.label}).`,
      subcategory.hint ? `Suggested authority: ${subcategory.hint}.` : "",
      `Reporter identity: ${anonymous ? "anonymous" : "named (will share contact with authority)"}.`,
      `Evidence narrative: ${description.trim()}`,
    ]
      .filter(Boolean)
      .join(" ");

    try {
      const { data, error } = await supabase.functions.invoke("analyze-civic", {
        body: {
          action: "reporting",
          content,
          residenceState: residenceState || undefined,
          residenceLga: residenceLga || undefined,
        },
      });
      if (error) throw error;
      if (!data?.ok || !data?.analysis) throw new Error("No report routing returned");
      const routing = data.analysis as ComplaintAnalysis;

      const { data: inserted, error: insErr } = await supabase
        .from("reports")
        .insert({
          user_id: null,
          is_anonymous: anonymous,
          action_type: subcategory.label,
          category: category.label,
          subcategory: subcategory.label,
          content,
          full_name: anonymous ? null : fullName.trim(),
          phone: anonymous ? null : phone.trim(),
          state: residenceState || null,
          lga: residenceLga || null,
          residence_state: residenceState || null,
          residence_lga: residenceLga || null,
          evidence_urls: evidence,
          ai_analysis: routing as unknown as any,
          status: "submitted",
        })
        .select("tracking_code")
        .single();
      if (insErr) throw insErr;

      setTrackingCode(inserted?.tracking_code ?? null);
      setAnalysis(routing);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not route your report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary/40 via-background to-background">
      <Helmet>
        <title>Report Misconduct — THE GATE®</title>
        <meta
          name="description"
          content="Report corruption, fraud, fake drugs, police brutality, election offences and other misconduct. Routed by THE GATE® to the right oversight body."
        />
        <link rel="canonical" href="https://thegate774app.lovable.app/reporting" />
      </Helmet>

      <ModuleHeader
        eyebrow="Module 04 · Reporting"
        title="Report Misconduct"
      />

      <section className="container max-w-5xl py-10 space-y-10">
        {!analysis && (
          <>
            {/* Whistle-blower banner */}
            <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] p-4 md:p-5 flex items-start gap-3 animate-fade-in">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" strokeWidth={1.75} />
              <div className="text-sm leading-relaxed">
                <strong className="font-heading">You are protected.</strong>{" "}
                Whistle-blowers are protected under the Nigerian Whistle-blower Policy (2016) and the
                Witness Protection programme. You may report anonymously below.
              </div>
            </div>

            <Step number={1} label="Choose what you're reporting">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {REPORTING_CATEGORIES.map((c) => {
                  const Icon = ICONS[c.icon];
                  const active = c.id === categoryId;
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setCategoryId(c.id);
                        setSubId("");
                      }}
                      className={cn(
                        "group relative text-left p-4 rounded-2xl border bg-card transition-all duration-300",
                        active
                          ? "border-primary shadow-civic -translate-y-0.5"
                          : "border-border hover:border-primary/40 hover:-translate-y-0.5",
                      )}
                    >
                      <div
                        className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center mb-3 transition-colors",
                          active
                            ? "bg-primary text-primary-foreground shadow-civic"
                            : "bg-primary/10 text-primary group-hover:bg-primary/15",
                        )}
                      >
                        <Icon className="h-5 w-5" strokeWidth={1.75} />
                      </div>
                      <div className="font-heading font-semibold text-sm leading-tight">{c.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-1 leading-snug">{c.blurb}</div>
                      {active && (
                        <div className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Check className="h-3 w-3" strokeWidth={2.5} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </Step>

            {category && (
              <Step number={2} label={`Pick the specific offence in ${category.label}`}>
                <div className="grid sm:grid-cols-2 gap-2.5 animate-fade-in">
                  {category.subcategories.map((s) => {
                    const active = s.id === subId;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSubId(s.id)}
                        className={cn(
                          "text-left p-4 rounded-xl border bg-card transition-all",
                          active
                            ? "border-primary bg-primary/[0.04]"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium text-sm leading-snug">{s.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{s.hint}</div>
                          </div>
                          {active && (
                            <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-0.5">
                              <Check className="h-3 w-3" strokeWidth={2.5} />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Step>
            )}

            {subcategory && (
              <Step number={3} label="Describe what happened & where">
                <div className="grid sm:grid-cols-2 gap-3 animate-fade-in">
                  <div>
                    <Label>State where it happened</Label>
                    <Select
                      value={residenceState}
                      onValueChange={(v) => {
                        setResidenceState(v);
                        setResidenceLga("");
                      }}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {states.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>LGA / Area Council</Label>
                    <Select value={residenceLga} onValueChange={setResidenceLga} disabled={!residenceState}>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder={residenceState ? "Select LGA" : "Select state first"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {lgas.map((l) => (
                          <SelectItem key={l} value={l}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4 animate-fade-in">
                  <Label>What happened? Include who, when, and any evidence you have</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    placeholder="E.g. 'On 12 May 2026 at the FRSC checkpoint along Lokoja–Abuja road, an officer (badge unclear) demanded ₦5,000 to release my vehicle. I have a phone recording.'"
                    className="rounded-xl resize-none"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    {description.trim().length}/10 minimum characters
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
                  <div>
                    <div className="font-heading font-semibold text-sm">Report anonymously</div>
                    <div className="text-xs text-muted-foreground">
                      We will not include your name or contact when routing to the authority.
                    </div>
                  </div>
                  <Switch checked={anonymous} onCheckedChange={setAnonymous} />
                </div>

                {!anonymous && (
                  <div className="mt-3 grid sm:grid-cols-2 gap-3 animate-fade-in">
                    <div>
                      <Label>Your full name</Label>
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Surname First-name"
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label>Phone number</Label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +234 803 000 0000"
                        className="h-11 rounded-xl"
                      />
                    </div>
                  </div>
                )}

                <div className="mt-4 rounded-xl border border-border bg-card p-4">
                  <Label>Evidence (optional)</Label>
                  <ReportEvidenceUploader
                    folder={folder}
                    paths={evidence}
                    onChange={setEvidence}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-5 mt-4 border-t border-border/60">
                  <p className="text-xs text-muted-foreground">
                    We'll route this report to the right oversight body and tell you how to follow up.
                  </p>
                  <Button
                    onClick={submit}
                    disabled={!canSubmit}
                    className="h-11 px-6 rounded-xl gap-2 btn-civic"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {loading ? "Routing your report…" : "Submit my report"}
                  </Button>
                </div>
              </Step>
            )}
          </>
        )}

        {analysis && (
          <div className="space-y-4 animate-fade-in">
            {trackingCode && (
              <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-heading font-semibold">Report received</div>
                    <div className="text-xs text-muted-foreground">
                      Save your tracking code. You'll need it to check status later.
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <code className="px-3 py-2 rounded-lg bg-background border border-border text-sm font-mono">
                    {trackingCode}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg gap-1.5"
                    onClick={() => {
                      navigator.clipboard.writeText(trackingCode);
                      toast.success("Tracking code copied");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </Button>
                </div>
              </div>
            )}
            <ComplaintReportCard analysis={analysis} eyebrow="Your Report Routing" />
            <div className="flex justify-end">
              <Button variant="outline" onClick={reset} className="rounded-xl gap-2">
                <RotateCcw className="h-4 w-4" /> Report something else
              </Button>
            </div>
          </div>
        )}
      </section>

      <ModuleFooter />
    </main>
  );
}

function Step({
  number,
  label,
  children,
}: {
  number: number;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center shadow-civic">
          {number}
        </div>
        <h2 className="font-heading text-base md:text-lg font-semibold tracking-tight">{label}</h2>
      </div>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-medium block mb-1.5">
      {children}
    </label>
  );
}