import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import { Loader2, Search, ShieldCheck, Clock, FileText } from "lucide-react";
import { toast } from "sonner";

import { ModuleHeader } from "@/components/civic/ModuleHeader";
import { ModuleFooter } from "@/components/civic/ModuleFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface TrackResult {
  tracking_code: string;
  status: string;
  category: string | null;
  subcategory: string | null;
  action_type: string | null;
  state: string | null;
  lga: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

const STEPS = [
  { key: "submitted", label: "Submitted" },
  { key: "received", label: "Received" },
  { key: "in_review", label: "Under Review" },
  { key: "escalated", label: "Escalated" },
  { key: "resolved", label: "Resolved" },
] as const;

function stepIndex(status: string) {
  const i = STEPS.findIndex((s) => s.key === status);
  return i === -1 ? 0 : i;
}

export default function TrackReport() {
  const [params, setParams] = useSearchParams();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [searched, setSearched] = useState(false);

  const lookup = async (raw: string) => {
    const c = raw.trim().toUpperCase();
    if (!c) {
      toast.error("Enter a tracking code");
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase.rpc("track_report_by_code", { p_code: c });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      setResult((row as TrackResult) ?? null);
      if (row) setParams({ code: c }, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lookup failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const q = params.get("code");
    if (q && !searched) void lookup(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = result ? stepIndex(result.status) : -1;

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary/40 via-background to-background">
      <Helmet>
        <title>Track a Report — THE GATE®</title>
        <meta name="description" content="Track the status of a report you submitted to THE GATE® using your tracking code." />
        <link rel="canonical" href="https://thegate774app.lovable.app/track-report" />
      </Helmet>

      <ModuleHeader eyebrow="Reporting · Tracking" title="Track Your Report" />

      <section className="container max-w-3xl py-10 space-y-8">
        <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] p-4 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" strokeWidth={1.75} />
          <div className="text-sm leading-relaxed">
            <strong className="font-heading">Your identity is protected.</strong>{" "}
            Tracking uses only your code — no personal details are revealed.
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void lookup(code);
          }}
          className="rounded-2xl border border-border bg-card p-5 space-y-3"
        >
          <label className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-medium block">
            Tracking code
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="GATE-RPT-XXXXXXXX"
              className="h-11 rounded-xl font-mono uppercase"
              autoFocus
            />
            <Button type="submit" disabled={loading} className="h-11 px-6 rounded-xl gap-2 btn-civic">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {loading ? "Looking up…" : "Track"}
            </Button>
          </div>
        </form>

        {searched && !loading && !result && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
            <div className="font-heading font-semibold">No report found</div>
            <p className="text-sm text-muted-foreground">
              Double-check the code. Letters and digits only — like{" "}
              <span className="font-mono">GATE-RPT-AB12CD34</span>.
            </p>
          </div>
        )}

        {result && (
          <div className="rounded-2xl border border-border bg-card p-6 space-y-6 animate-fade-in">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-medium">
                  Report
                </div>
                <div className="font-mono font-semibold text-base mt-0.5">{result.tracking_code}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-medium">
                  Submitted
                </div>
                <div className="text-sm mt-0.5 inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
                  {new Date(result.created_at).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {result.category && <Fact label="Category" value={result.category} />}
              {result.subcategory && <Fact label="Specific offence" value={result.subcategory} />}
              {(result.state || result.lga) && (
                <Fact label="Location" value={[result.lga, result.state].filter(Boolean).join(", ")} />
              )}
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-medium mb-3">
                Status
              </div>
              <div className="flex items-center justify-between gap-2">
                {STEPS.map((s, i) => {
                  const active = i <= current;
                  return (
                    <div key={s.key} className="flex-1 flex flex-col items-center text-center">
                      <div
                        className={cn(
                          "h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-semibold border transition-colors",
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted text-muted-foreground border-border",
                        )}
                      >
                        {i + 1}
                      </div>
                      <div
                        className={cn(
                          "text-[10px] mt-1.5 leading-tight",
                          active ? "text-foreground font-medium" : "text-muted-foreground",
                        )}
                      >
                        {s.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {result.resolution_notes && (
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-medium mb-1.5 inline-flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" strokeWidth={1.75} /> Reviewer notes
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.resolution_notes}</p>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground">
              Last updated {new Date(result.updated_at).toLocaleString()}.
            </p>
          </div>
        )}
      </section>

      <ModuleFooter />
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-medium">
        {label}
      </div>
      <div className="text-sm mt-1 leading-snug">{value}</div>
    </div>
  );
}