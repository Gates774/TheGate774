import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Loader2,
  Send,
  RotateCcw,
  Scale,
  ListChecks,
  Activity,
  FileBadge,
  GraduationCap,
  Stethoscope,
  Receipt,
  Vote,
  LandPlot,
  PiggyBank,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import { ModuleHeader } from "@/components/civic/ModuleHeader";
import { ModuleFooter } from "@/components/civic/ModuleFooter";
import { ComplaintReportCard, type ComplaintAnalysis } from "@/components/civic/ComplaintReportCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ENQUIRY_CATEGORIES } from "@/data/enquiryCategories";
import { NIGERIA_LGAS } from "@/data/nigeriaLgas";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const ICONS = {
  rights: Scale,
  procedures: ListChecks,
  status: Activity,
  documents: FileBadge,
  education: GraduationCap,
  health: Stethoscope,
  tax: Receipt,
  elections: Vote,
  land: LandPlot,
  benefits: PiggyBank,
} as const;

export default function Enquiries() {
  const [categoryId, setCategoryId] = useState<string>("");
  const [subId, setSubId] = useState<string>("");
  const [question, setQuestion] = useState("");
  const [residenceState, setResidenceState] = useState<string>("");
  const [residenceLga, setResidenceLga] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ComplaintAnalysis | null>(null);

  const category = useMemo(
    () => ENQUIRY_CATEGORIES.find((c) => c.id === categoryId) ?? null,
    [categoryId],
  );
  const subcategory = useMemo(
    () => category?.subcategories.find((s) => s.id === subId) ?? null,
    [category, subId],
  );
  const states = Object.keys(NIGERIA_LGAS);
  const lgas = residenceState ? NIGERIA_LGAS[residenceState] ?? [] : [];

  const canSubmit = Boolean(category && subcategory) && !loading;

  const reset = () => {
    setAnalysis(null);
    setCategoryId("");
    setSubId("");
    setQuestion("");
  };

  const submit = async () => {
    if (!category || !subcategory) {
      toast.error("Please pick a topic and a specific enquiry.");
      return;
    }
    setLoading(true);
    setAnalysis(null);

    const content = [
      `Enquiry topic: ${subcategory.label} (${category.label}).`,
      subcategory.hint ? `Context: ${subcategory.hint}.` : "",
      question.trim() ? `Citizen question: ${question.trim()}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    try {
      const { data, error } = await supabase.functions.invoke("analyze-civic", {
        body: {
          action: "enquiry",
          content,
          residenceState: residenceState || undefined,
          residenceLga: residenceLga || undefined,
        },
      });
      if (error) throw error;
      if (!data?.ok || !data?.analysis) throw new Error("No answer returned");
      setAnalysis(data.analysis as ComplaintAnalysis);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not answer your enquiry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary/40 via-background to-background">
      <Helmet>
        <title>Make an Enquiry — THE GATE®</title>
        <meta
          name="description"
          content="Ask about Nigerian government rights, procedures, statuses and entitlements. THE GATE® answers, grounded in the 1999 Constitution."
        />
        <link rel="canonical" href="https://thegate774app.lovable.app/enquiries" />
      </Helmet>

      <ModuleHeader eyebrow="Module 03 · Enquiries" title="Ask the Government" />

      <section className="container max-w-5xl py-10 space-y-10">
        {!analysis && (
          <>
            <Step number={1} label="Pick an enquiry topic">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {ENQUIRY_CATEGORIES.map((c) => {
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
              <Step number={2} label={`Pick a specific enquiry in ${category.label}`}>
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
              <Step number={3} label="Add your question (optional) and where you are">
                <div className="grid sm:grid-cols-2 gap-3 animate-fade-in">
                  <div>
                    <Label>State of residence</Label>
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
                  <Label>Your specific question (optional)</Label>
                  <Textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    rows={4}
                    placeholder="E.g. 'How long does it take to collect a PVC after transferring my registration to a new LGA?'"
                    className="rounded-xl resize-none"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-5 mt-4 border-t border-border/60">
                  <p className="text-xs text-muted-foreground">
                    We'll answer using the 1999 Constitution and point you to the right office.
                  </p>
                  <Button
                    onClick={submit}
                    disabled={!canSubmit}
                    className="h-11 px-6 rounded-xl gap-2 btn-civic"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {loading ? "Looking it up…" : "Get my answer"}
                  </Button>
                </div>
              </Step>
            )}
          </>
        )}

        {analysis && (
          <div className="space-y-4 animate-fade-in">
            <ComplaintReportCard analysis={analysis} eyebrow="Your Civic Answer" />
            <div className="flex justify-end">
              <Button variant="outline" onClick={reset} className="rounded-xl gap-2">
                <RotateCcw className="h-4 w-4" /> Ask another question
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