import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Send, Loader2, CheckCircle2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getSession } from "@/lib/session";
import { ACTION_TYPES, suggestMDAs, LEVEL_LABELS } from "@/data/govResponsibilities";
import { VoiceRecorder } from "@/components/civic/VoiceRecorder";
import { VerdictCard, type Analysis } from "@/components/civic/VerdictCard";
import { EvidenceUploader } from "@/components/civic/EvidenceUploader";

export default function Workspace() {
  const { action = "complaints" } = useParams();
  const navigate = useNavigate();
  const session = getSession();
  const meta = ACTION_TYPES.find((a) => a.id === action);

  useEffect(() => {
    if (!session) navigate(`/start/${action}`, { replace: true });
  }, [session, action, navigate]);

  const [content, setContent] = useState("");
  const [evidence, setEvidence] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const suggestions = useMemo(() => suggestMDAs(content, 4), [content]);
  const showEvidence = action === "reporting" || action === "complaints";

  const analyze = async () => {
    if (content.trim().length < 5) {
      toast.error("Please describe your matter (at least a few words)");
      return;
    }
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-civic", {
        body: {
          action,
          content,
          residenceState: session?.residenceState,
          residenceLga: session?.residenceLga,
        },
      });
      if (error || !data?.ok) throw new Error(data?.error ?? "Analysis failed");
      setAnalysis(data.analysis as Analysis);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not analyze");
    } finally {
      setAnalyzing(false);
    }
  };

  const submit = async () => {
    if (!session) return;
    if (content.trim().length < 5) {
      toast.error("Please describe your matter first");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("reports").insert({
        action_type: action,
        full_name: session.fullName,
        phone: session.phone,
        origin_state: session.originState,
        origin_lga: session.originLga,
        residence_state: session.residenceState,
        residence_lga: session.residenceLga,
        content,
        evidence_urls: evidence,
        ai_analysis: (analysis ?? null) as never,
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success("Submitted to THE GATE®");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto h-14 w-14 rounded-full bg-success/10 text-success flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <CardTitle>Your matter has been received</CardTitle>
            <CardDescription>
              We have routed it to {analysis?.mda ?? "the appropriate authority"}.
              {analysis?.officer ? ` Responsible: ${analysis.officer}.` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button onClick={() => navigate("/")}>Back to home</Button>
            <Button
              variant="ghost"
              onClick={() => {
                setSubmitted(false);
                setContent("");
                setEvidence([]);
                setAnalysis(null);
              }}
            >
              Submit another
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <Helmet>
        <title>{`${meta?.label ?? "Workspace"} — THE GATE®`}</title>
        <meta name="description" content={`${meta?.desc ?? "Submit your civic matter to THE GATE®."} Routed to the responsible Nigerian authority.`} />
        <link rel="canonical" href={`https://thegate774app.lovable.app/workspace/${action}`} />
        <meta property="og:title" content={`${meta?.label ?? "Workspace"} — THE GATE®`} />
        <meta property="og:description" content={meta?.desc ?? "Submit your civic matter to THE GATE®."} />
        <meta property="og:url" content={`https://thegate774app.lovable.app/workspace/${action}`} />
      </Helmet>
      <div className="max-w-3xl mx-auto space-y-6">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All actions
        </button>

        <header className="space-y-2">
          <Badge variant="secondary">{meta?.label ?? action}</Badge>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {prompt(action)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {meta?.desc} · {session?.residenceLga}, {session?.residenceState}
          </p>
        </header>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <Label htmlFor="matter" className="sr-only">Describe your matter</Label>
            <Textarea
              id="matter"
              aria-label="Describe your matter"
              placeholder={placeholderFor(action)}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="resize-none text-base"
            />

            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Search className="h-3.5 w-3.5" /> Possible matches:
                </span>
                {suggestions.map((s) => (
                  <Badge key={s.name} variant="outline" className="font-normal">
                    {s.acronym ?? s.name} · {LEVEL_LABELS[s.level].split(" (")[0]}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <VoiceRecorder onTranscript={(t) => setContent((c) => (c ? `${c} ${t}` : t))} />
              <Button onClick={analyze} disabled={analyzing} variant="secondary" className="gap-2">
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {analyzing ? "Analyzing…" : "Analyze with AI"}
              </Button>
            </div>

            {showEvidence && (
              <div className="pt-2 border-t border-border">
                <div className="text-sm font-medium mb-3">Evidence (optional)</div>
                <EvidenceUploader urls={evidence} onChange={setEvidence} />
              </div>
            )}
          </CardContent>
        </Card>

        {analysis && <VerdictCard analysis={analysis} />}

        <div className="flex justify-end">
          <Button onClick={submit} disabled={submitting || !content.trim()} className="gap-2" size="lg">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit to THE GATE®
          </Button>
        </div>
      </div>
    </main>
  );
}

function prompt(action: string) {
  switch (action) {
    case "complaints": return "What is your complaint?";
    case "request": return "What service are you requesting?";
    case "enquiries": return "What do you want to know?";
    case "reporting": return "What do you want to report?";
    case "application": return "What are you applying for?";
    case "registration": return "What do you want to register for?";
    default: return "Tell us what you need";
  }
}

function placeholderFor(action: string) {
  switch (action) {
    case "complaints": return "Describe your complaint in your own words — e.g. 'The drainage in front of my house has been blocked for two weeks…'";
    case "request": return "Describe the service you need — e.g. 'I need a Police Character Certificate for a job abroad…'";
    case "enquiries": return "Ask anything — e.g. 'How do I check my NIN registration status?'";
    case "reporting": return "Describe what happened — e.g. 'I want to report a public official demanding a bribe…'";
    case "application": return "Describe what you are applying for — e.g. 'I want to apply for an international passport…'";
    case "registration": return "Describe what you want to register — e.g. 'I need to register for my National ID (NIN)…'";
    default: return "Describe your matter…";
  }
}