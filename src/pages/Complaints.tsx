import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Loader2, Send, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { ModuleHeader } from "@/components/civic/ModuleHeader";
import { ModuleFooter } from "@/components/civic/ModuleFooter";
import { AutosuggestTextarea } from "@/components/civic/AutosuggestTextarea";
import { VoiceRecorder } from "@/components/civic/VoiceRecorder";
import { ComplaintReportCard, type ComplaintAnalysis } from "@/components/civic/ComplaintReportCard";
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

  const states = Object.keys(NIGERIA_LGAS);
  const lgas = residenceState ? NIGERIA_LGAS[residenceState] ?? [] : [];

  const reset = () => {
    setAnalysis(null);
    setNoMatch(false);
    setContent("");
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
      // Out-of-scope handling per spec: still show fallback prompt but include AI guidance.
      if (a.out_of_scope && !(a.action_plan?.length || a.next_steps?.length)) {
        setNoMatch(true);
      } else {
        setAnalysis(a);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not analyse your complaint");
    } finally {
      setLoading(false);
    }
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

      <ModuleHeader eyebrow="Module 01 · Complaints" title="Lodge a Complaint" />

      <section className="container max-w-3xl py-10 space-y-8">
        {!analysis && !noMatch && (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-medium block mb-1.5">
                  State of residence
                </label>
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
                <label className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-medium block mb-1.5">
                  LGA / Area Council
                </label>
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

            <div>
              <div className="flex items-end justify-between mb-2">
                <label className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-medium">
                  Describe your complaint
                </label>
                <span className="text-[11px] text-muted-foreground">{content.length} chars</span>
              </div>
              <AutosuggestTextarea
                value={content}
                onChange={setContent}
                topics={COMPLAINT_TOPICS}
                placeholder="Start typing — e.g. 'Police officer at my LGA station collected ₦5,000…'"
                rows={6}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <VoiceRecorder onTranscript={(t) => setContent((prev) => (prev ? `${prev} ${t}` : t))} />
              <span className="text-xs text-muted-foreground">Tap to speak your complaint in English or any Nigerian language.</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/60">
              <Button
                onClick={submit}
                disabled={loading || content.trim().length < 10}
                className="h-11 px-6 rounded-xl gap-2 btn-civic"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {loading ? "Analysing with THE GATE® AI…" : "Generate my complaint report"}
              </Button>
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
            <ComplaintReportCard analysis={analysis} />
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