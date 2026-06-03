import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Loader2, Send, RotateCcw, MapPin, CheckCircle2, Copy, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [residenceState, setResidenceState] = useState<string>("");
  const [residenceLga, setResidenceLga] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ComplaintAnalysis | null>(null);
  const [noMatch, setNoMatch] = useState(false);
  const [evidence, setEvidence] = useState<string[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const states = Object.keys(NIGERIA_LGAS);
  const lgas = residenceState ? NIGERIA_LGAS[residenceState] ?? [] : [];

  // Lazily resolve auth user (used for evidence folder + persistence)
  const ensureUser = async (): Promise<string | null> => {
    if (userId) return userId;
    const { data } = await supabase.auth.getUser();
    const id = data.user?.id ?? null;
    setUserId(id);
    return id;
  };

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
    const uid = await ensureUser();
    if (!uid) {
      toast.error("Please sign in to lodge a complaint.");
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
          user_id: uid,
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
        eyebrow="Module 01 · Complaints"
        title="Lodge a Complaint"
        action={
          <Link
            to="/my-complaints"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-foreground/90 hover:text-primary-foreground transition"
          >
            <ListChecks className="h-3.5 w-3.5" /> My complaints
          </Link>
        }
      />

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

            {/* Evidence + location */}
            <div className="space-y-4 rounded-2xl border border-border/70 bg-card/50 p-4">
              <div>
                <label className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-medium block mb-2">
                  Evidence (optional)
                </label>
                {userId ? (
                  <ComplaintEvidenceUploader userId={userId} paths={evidence} onChange={setEvidence} />
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => ensureUser()}
                    className="rounded-xl"
                  >
                    Enable evidence upload
                  </Button>
                )}
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-medium block mb-2">
                  Live location (optional)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={captureLocation}
                    disabled={gpsLoading}
                    className="gap-2 rounded-xl"
                  >
                    {gpsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                    {coords ? "Re-capture location" : "Capture my location"}
                  </Button>
                  {coords && (
                    <span className="text-xs text-muted-foreground">
                      {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                    </span>
                  )}
                </div>
              </div>
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate("/my-complaints")}
                        className="h-8 gap-1.5 rounded-lg"
                      >
                        <ListChecks className="h-3.5 w-3.5" /> Track status
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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