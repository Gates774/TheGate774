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
  ThumbsUp,
  ThumbsDown,
  History,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

import { ModuleHeader } from "@/components/civic/ModuleHeader";
import { ModuleFooter } from "@/components/civic/ModuleFooter";
import { ComplaintReportCard, type ComplaintAnalysis } from "@/components/civic/ComplaintReportCard";
import { StepCarousel } from "@/components/civic/StepCarousel";
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
  const [enquiryId, setEnquiryId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<1 | -1 | null>(null);
  const [step, setStep] = useState(0);

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
    setEnquiryId(null);
    setFeedback(null);
    setStep(0);
  };

  const submit = async () => {
    if (!category || !subcategory) {
      toast.error("Please pick a topic and a specific enquiry.");
      return;
    }
    setLoading(true);
    setAnalysis(null);
    setEnquiryId(null);
    setFeedback(null);

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
      const a = data.analysis as ComplaintAnalysis;
      setAnalysis(a);

      // Persist anonymously so admins can review.
      const { data: row } = await supabase
        .from("enquiries")
        .insert({
          user_id: null,
          category_id: category.id,
          category_label: category.label,
          subcategory_id: subcategory.id,
          subcategory_label: subcategory.label,
          question: question.trim() || null,
          state: residenceState || null,
          lga: residenceLga || null,
          responsible_authority:
            a.responsible_authority?.name ?? a.mda ?? null,
          ai_analysis: a as never,
        })
        .select("id")
        .single();
      if (row?.id) setEnquiryId(row.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not answer your enquiry");
    } finally {
      setLoading(false);
    }
  };

  const rate = async (value: 1 | -1) => {
    if (!enquiryId) {
      // No persisted row yet (likely signed out); accept rating locally
      setFeedback(value);
      toast.success(value === 1 ? "Glad it helped." : "Thanks — we'll improve.");
      return;
    }
    setFeedback(value);
    const { error } = await supabase
      .from("enquiries")
      .update({ helpful_rating: value })
      .eq("id", enquiryId);
    if (error) toast.error("Could not save your feedback.");
    else toast.success(value === 1 ? "Glad it helped." : "Thanks — we'll improve.");
  };

  const askFollowUp = (q: string) => {
    setQuestion(q);
    setAnalysis(null);
    setEnquiryId(null);
    setFeedback(null);
    setStep(2);
    // Scroll back to top so the user sees the form
    window.scrollTo({ top: 0, behavior: "smooth" });
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

      <ModuleHeader
        eyebrow="Module 03 · Enquiries"
        title="Ask the Government"
      />

      <section className="container max-w-5xl py-10 space-y-10">
        {!analysis && (
          <StepCarousel
            step={step}
            onStepChange={setStep}
            steps={[
              {
                id: "topic",
                label: "Topic",
                canNext: Boolean(category),
                content: (
                  <StepFrame title="Pick an enquiry topic">
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
                  </StepFrame>
                ),
              },
              {
                id: "specific",
                label: "Specific",
                canNext: Boolean(subcategory),
                content: (
                  <StepFrame
                    title={
                      category
                        ? `Pick a specific enquiry in ${category.label}`
                        : "Pick a specific enquiry"
                    }
                  >
                    <div className="grid sm:grid-cols-2 gap-2.5">
                      {(category?.subcategories ?? []).map((s) => {
                    const active = s.id === subId;
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSubId(s.id);
                        }}
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
                  </StepFrame>
                ),
              },
              {
                id: "ask",
                label: "Ask",
                hideNext: true,
                content: (
                  <StepFrame title="Add your question (optional) and where you are">
                    <div className="grid sm:grid-cols-2 gap-3">
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

                <div className="mt-4">
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
                  </StepFrame>
                ),
              },
            ]}
          />
        )}

        {analysis && (
          <div className="space-y-4 animate-fade-in">
            <ComplaintReportCard analysis={analysis} eyebrow="Your Civic Answer" />

            {/* Helpful feedback */}
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-medium mb-1">
                  Was this helpful?
                </div>
                <p className="text-sm text-foreground/85">
                  Your feedback helps THE GATE® get sharper for everyone.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={feedback === 1 ? "default" : "outline"}
                  onClick={() => rate(1)}
                  disabled={feedback !== null}
                  className="rounded-xl gap-1.5"
                >
                  <ThumbsUp className="h-4 w-4" strokeWidth={1.75} /> Helpful
                </Button>
                <Button
                  size="sm"
                  variant={feedback === -1 ? "default" : "outline"}
                  onClick={() => rate(-1)}
                  disabled={feedback !== null}
                  className="rounded-xl gap-1.5"
                >
                  <ThumbsDown className="h-4 w-4" strokeWidth={1.75} /> Not helpful
                </Button>
              </div>
            </div>

            {/* Suggested follow-ups */}
            {analysis.follow_ups && analysis.follow_ups.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.75} />
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
                    You may also want to ask
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysis.follow_ups.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => askFollowUp(q)}
                      className="text-left text-sm px-3 py-2 rounded-xl border border-border bg-background hover:border-primary/40 hover:bg-primary/5 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

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

function StepFrame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-border/60 bg-card/95 shadow-[0_24px_60px_-30px_hsl(var(--civic-green)/0.35)] backdrop-blur-sm p-6 sm:p-8">
      <h2 className="font-heading text-base md:text-lg font-semibold tracking-tight mb-5">
        {title}
      </h2>
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