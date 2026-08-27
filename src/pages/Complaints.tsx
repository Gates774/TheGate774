import { useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Loader2,
  Send,
  RotateCcw,
  MapPin,
  CheckCircle2,
  Copy,
  ShieldCheck,
  MessageSquareWarning,
  Paperclip,
  MapPinned,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

import { ModuleHeader } from "@/components/civic/ModuleHeader";
import { ModuleFooter } from "@/components/civic/ModuleFooter";
import { AutosuggestTextarea } from "@/components/civic/AutosuggestTextarea";
import { VoiceRecorder } from "@/components/civic/VoiceRecorder";
import { ComplaintReportCard, type ComplaintAnalysis } from "@/components/civic/ComplaintReportCard";
import { ComplaintEvidenceUploader } from "@/components/civic/ComplaintEvidenceUploader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COMPLAINT_TOPICS } from "@/data/complaintTopics";
import { NIGERIA_LGAS } from "@/data/nigeriaLgas";
import { supabase } from "@/integrations/supabase/client";

export default function Complaints() {
  const [content, setContent] = useState("");
  const [residenceState, setResidenceState] = useState<string>("");
  const [residenceLga, setResidenceLga] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ComplaintAnalysis | null>(null);
  const [noMatch, setNoMatch] = useState(false);
  const [evidence, setEvidence] = useState<string[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  const states = Object.keys(NIGERIA_LGAS);
  const lgas = residenceState ? NIGERIA_LGAS[residenceState] ?? [] : [];

  const captureLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Your browser does not support GPS capture.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
        toast.success("Location captured.");
      },
      (err) => {
        setGpsLoading(false);
        toast.error(err.message || "Could not capture location.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const reset = () => {
    setAnalysis(null);
    setNoMatch(false);
    setContent("");
    setEvidence([]);
    setCoords(null);
    setReference(null);
  };

  const submit = async () => {
    if (content.trim().length < 10) {
      toast.error("Please describe your complaint in a little more detail.");
      return;
    }
    setLoading(true);
    setAnalysis(null);
    setNoMatch(false);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-civic", {
        body: {
          action: "complaint",
          content: content.trim(),
          residenceState: residenceState || undefined,
          residenceLga: residenceLga || undefined,
        },
      });
      if (error) throw error;
      if (!data?.ok || !data?.analysis) throw new Error("No analysis returned");
      const a = data.analysis as ComplaintAnalysis;
      if (a.out_of_scope && !(a.action_plan?.length || a.next_steps?.length)) {
        setNoMatch(true);
        return;
      }

      // Persist the complaint so user + admins can track it
      const title = (a.issue_summary || content.trim()).slice(0, 120);
      const category =
        a.tier === "federal" ? "federal" : a.tier === "state" ? "state" : a.tier === "local" ? "local" : "general";

      const { data: row, error: insertErr } = await supabase
        .from("complaints")
        .insert({
          user_id: null,
          title,
          description: content.trim(),
          category,
          state: residenceState || null,
          lga: residenceLga || null,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          evidence_urls: evidence,
          ai_analysis: a as never,
        })
        .select("reference_code")
        .single();

      if (insertErr) {
        toast.error("Saved your analysis but could not file the complaint. Please try again.");
      } else {
        setReference(row?.reference_code ?? null);
      }
      setAnalysis(a);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not analyse your complaint");
    } finally {
      setLoading(false);
    }
  };

  const copyRef = () => {
    if (!reference) return;
    navigator.clipboard.writeText(reference);
    toast.success("Reference copied");
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary/40 via-background to-background">
      <Helmet>
        <title>Lodge a Complaint — THE GATE®</title>
        <meta
          name="description"
          content="Lodge your complaint and let THE GATE® route it to the exact arm of government responsible — Federal, State, or LGA."
        />
        <link rel="canonical" href="https://thegate774app.lovable.app/complaints" />
      </Helmet>

      <ModuleHeader
        title="Lodge a Complaint"
      />

      <section className="container max-w-3xl py-10 md:py-14 space-y-8">
        {!analysis && !noMatch && (
          <div className="relative">
            {/* Soft ambient glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-6 -top-6 h-40 rounded-[2rem] bg-gradient-to-b from-[hsl(var(--accent))]/15 to-transparent blur-2xl"
            />

            <div className="relative rounded-[1.75rem] border border-border/60 bg-card/95 shadow-[0_24px_60px_-30px_hsl(var(--civic-green)/0.45)] backdrop-blur-sm overflow-hidden">
              {/* Card header */}
              <div className="px-6 sm:px-8 pt-7 pb-6 border-b border-border/60 bg-gradient-to-b from-secondary/40 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center ring-1 ring-primary/15">
                    <MessageSquareWarning className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-heading text-lg sm:text-xl font-semibold tracking-tight">
                      File a citizen complaint
                    </h2>
                    <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed">
                      THE GATE® routes your complaint to the responsible Federal, State or Local MDA.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-8">
                {/* SECTION — Location */}
                <FormSection
                  step="01"
                  title="Where are you?"
                  description="So we route your complaint to the right tier of government."
                >
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>State of residence</FieldLabel>
                      <Select
                        value={residenceState}
                        onValueChange={(v) => {
                          setResidenceState(v);
                          setResidenceLga("");
                        }}
                      >
                        <SelectTrigger className="h-12 rounded-xl bg-background border-border/70 focus:border-primary/60 transition-colors">
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
                      <FieldLabel>LGA / Area Council</FieldLabel>
                      <Select value={residenceLga} onValueChange={setResidenceLga} disabled={!residenceState}>
                        <SelectTrigger className="h-12 rounded-xl bg-background border-border/70 focus:border-primary/60 transition-colors">
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
                </FormSection>

                {/* SECTION — Describe */}
                <FormSection
                  step="02"
                  title="Describe your complaint"
                  description="Be specific — what happened, where, and who was involved."
                >
                  <div className="relative group">
                    <div
                      aria-hidden
                      className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/20 via-transparent to-[hsl(var(--accent))]/20 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"
                    />
                    <div className="relative rounded-2xl bg-background border border-border/70 group-focus-within:border-primary/50 transition-colors">
                      <AutosuggestTextarea
                        value={content}
                        onChange={setContent}
                        topics={COMPLAINT_TOPICS}
                        placeholder="Start typing — e.g. 'Police officer at my LGA station collected ₦5,000 at a checkpoint on…'"
                        rows={6}
                      />
                      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/60 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Lock className="h-3 w-3" strokeWidth={2} />
                          End-to-end private — only routed to the responsible MDA.
                        </div>
                        <span className="tabular-nums">{content.length} chars</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <VoiceRecorder onTranscript={(t) => setContent((prev) => (prev ? `${prev} ${t}` : t))} />
                    <span className="text-xs text-muted-foreground">
                      Or speak it — in English or any Nigerian language.
                    </span>
                  </div>
                </FormSection>

                {/* SECTION — Evidence */}
                <FormSection
                  step="03"
                  title="Strengthen your complaint (optional)"
                  description="Attach proof and pinpoint the spot — both make follow-up faster."
                >
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-dashed border-border/80 bg-background/60 p-4 hover:border-primary/40 transition-colors">
                      <div className="flex items-center gap-2 mb-3">
                        <Paperclip className="h-4 w-4 text-primary" strokeWidth={1.75} />
                        <span className="text-[11px] uppercase tracking-[0.16em] font-semibold text-foreground/80">
                          Evidence
                        </span>
                      </div>
                      <ComplaintEvidenceUploader userId="anon" paths={evidence} onChange={setEvidence} />
                    </div>

                    <div className="rounded-2xl border border-dashed border-border/80 bg-background/60 p-4 hover:border-primary/40 transition-colors">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPinned className="h-4 w-4 text-primary" strokeWidth={1.75} />
                        <span className="text-[11px] uppercase tracking-[0.16em] font-semibold text-foreground/80">
                          Live location
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={captureLocation}
                        disabled={gpsLoading}
                        className="w-full justify-center gap-2 rounded-xl h-11 border-border/70 hover:border-primary/40 hover:bg-primary/5"
                      >
                        {gpsLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MapPin className="h-4 w-4" />
                        )}
                        {coords ? "Re-capture location" : "Capture my location"}
                      </Button>
                      {coords && (
                        <div className="mt-2.5 text-[11px] text-muted-foreground font-mono text-center">
                          {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                        </div>
                      )}
                    </div>
                  </div>
                </FormSection>
              </div>

              {/* Footer */}
              <div className="px-6 sm:px-8 py-5 border-t border-border/60 bg-secondary/30 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" strokeWidth={1.75} />
                  Anonymous submission — no account required.
                </div>
                <Button
                  onClick={submit}
                  disabled={loading || content.trim().length < 10}
                  className="h-12 px-6 rounded-xl gap-2 btn-civic shadow-civic"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {loading ? "Analysing with THE GATE® AI…" : "Generate my complaint report"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {noMatch && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4 animate-fade-in">
            <h2 className="font-heading text-xl font-semibold">We couldn't find an exact match</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Please describe your complaint in more detail, or choose a related category. We won't forward unmatched complaints —
              your privacy is protected.
            </p>
            <Button variant="outline" onClick={() => setNoMatch(false)} className="rounded-xl">
              Rewrite my complaint
            </Button>
          </div>
        )}

        {analysis && (
          <div className="space-y-4">
            {reference && (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 animate-fade-in">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-primary" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading text-base font-semibold">Complaint filed</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Save this reference code to track your complaint.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <code className="px-3 py-1.5 rounded-md bg-background border border-border text-sm font-mono">
                        {reference}
                      </code>
                      <Button size="sm" variant="ghost" onClick={copyRef} className="h-8 gap-1.5">
                        <Copy className="h-3.5 w-3.5" /> Copy
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {(analysis.issues?.length ? analysis.issues : [analysis]).map((issue, index) => (
              <div key={issue.issue_id ?? index} className="space-y-3">
                {analysis.issues && analysis.issues.length > 1 && (
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Issue {index + 1} of {analysis.issues.length}</div>
                )}
                {issue.routing_status && issue.routing_status !== "routed" && (
                  <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm leading-relaxed">
                    <strong>Routing paused:</strong> This issue was not automatically routed because the evidence was ambiguous or insufficient. {issue.clarifying_question || "Confirm the key facts and responsible authority before submitting."}
                  </div>
                )}
                {issue.emergency && (
                  <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm leading-relaxed">
                    <strong>Emergency:</strong> {issue.emergency_instruction || "If anyone is in immediate danger, contact emergency services now. Do not wait for this report."}
                  </div>
                )}
                <ComplaintReportCard analysis={issue} />
              </div>
            ))}
            <div className="flex justify-end">
              <Button variant="outline" onClick={reset} className="rounded-xl gap-2">
                <RotateCcw className="h-4 w-4" /> Lodge another complaint
              </Button>
            </div>
          </div>
        )}
      </section>

      <ModuleFooter />
    </main>
  );
}

function FormSection({
  step,
  title,
  description,
  children,
}: {
  step: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-6 min-w-[2rem] px-2 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold tracking-[0.18em] uppercase ring-1 ring-primary/15">
          {step}
        </span>
        <div className="min-w-0">
          <h3 className="font-heading text-[15px] font-semibold tracking-tight leading-tight">
            {title}
          </h3>
          {description && (
            <p className="text-[12.5px] text-muted-foreground mt-0.5 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground font-semibold block mb-1.5">
      {children}
    </label>
  );
}