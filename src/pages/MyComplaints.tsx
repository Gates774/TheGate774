import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Loader2, FileText, Plus, MapPin, Paperclip, Copy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { ModuleHeader } from "@/components/civic/ModuleHeader";
import { ModuleFooter } from "@/components/civic/ModuleFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ComplaintRow = Database["public"]["Tables"]["complaints"]["Row"];

const STATUS_META: Record<
  ComplaintRow["status"],
  { label: string; tone: string }
> = {
  pending: { label: "Submitted", tone: "bg-muted text-foreground border-border" },
  in_review: { label: "Under Review", tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  escalated: { label: "Escalated", tone: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30" },
  resolved: { label: "Resolved", tone: "bg-primary/10 text-primary border-primary/30" },
  closed: { label: "Closed", tone: "bg-muted text-muted-foreground border-border" },
};

const STATUS_ORDER: ComplaintRow["status"][] = ["pending", "in_review", "escalated", "resolved", "closed"];

export default function MyComplaints() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ComplaintRow[]>([]);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!active) return;
      if (!u.user) {
        setAuthed(false);
        setLoading(false);
        return;
      }
      setAuthed(true);
      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) toast.error(error.message);
      setRows((data ?? []) as ComplaintRow[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const copy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    toast.success("Reference copied");
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary/40 via-background to-background">
      <Helmet>
        <title>My Complaints — THE GATE®</title>
        <meta name="description" content="Track every complaint you have lodged through THE GATE® and follow its resolution status." />
      </Helmet>

      <ModuleHeader
        eyebrow="Module 01 · Complaints"
        title="My Complaints"
        action={
          <Link
            to="/complaints"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white/90 hover:text-white bg-white/10 border border-white/25 backdrop-blur-sm hover:border-white/45 transition-all"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} /> New complaint
          </Link>
        }
      />

      <section className="container max-w-3xl py-10 space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading your complaints…
          </div>
        )}

        {!loading && authed === false && (
          <EmptyCard
            title="Sign in to view your complaints"
            body="You need to be signed in to track the complaints you have lodged."
            cta={<Button asChild className="rounded-xl btn-civic"><Link to="/auth">Sign in</Link></Button>}
          />
        )}

        {!loading && authed && rows.length === 0 && (
          <EmptyCard
            title="No complaints yet"
            body="When you lodge a complaint, it will appear here with a reference code and real-time status updates."
            cta={
              <Button asChild className="rounded-xl btn-civic gap-2">
                <Link to="/complaints"><Plus className="h-4 w-4" /> Lodge your first complaint</Link>
              </Button>
            }
          />
        )}

        {!loading && rows.map((c) => {
          const meta = STATUS_META[c.status];
          const stepIndex = STATUS_ORDER.indexOf(c.status);
          return (
            <article
              key={c.id}
              className="rounded-2xl border border-border bg-card p-5 space-y-3 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code
                      className="px-2 py-0.5 rounded bg-muted text-[11px] font-mono cursor-pointer hover:bg-muted/70"
                      onClick={() => copy(c.reference_code)}
                      title="Click to copy"
                    >
                      {c.reference_code}
                    </code>
                    <button
                      onClick={() => copy(c.reference_code)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Copy reference code"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  <h3 className="mt-1.5 font-heading text-base font-semibold leading-snug line-clamp-2">
                    {c.title}
                  </h3>
                </div>
                <Badge variant="outline" className={`shrink-0 border ${meta.tone}`}>
                  {meta.label}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>

              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
                <span>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                {c.lga && c.state && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {c.lga}, {c.state}
                  </span>
                )}
                {c.evidence_urls && c.evidence_urls.length > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Paperclip className="h-3 w-3" /> {c.evidence_urls.length} evidence file{c.evidence_urls.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              {/* Progress steps */}
              <div className="pt-1">
                <div className="flex items-center gap-1">
                  {STATUS_ORDER.slice(0, 4).map((s, i) => {
                    const active = i <= stepIndex && c.status !== "closed";
                    const done = i < stepIndex || (c.status === "resolved" && i <= 3);
                    return (
                      <div key={s} className="flex-1">
                        <div
                          className={`h-1.5 rounded-full ${
                            done || active ? "bg-primary" : "bg-muted"
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  <span>Submitted</span>
                  <span>Reviewing</span>
                  <span>Escalated</span>
                  <span>Resolved</span>
                </div>
              </div>

              {c.resolution_notes && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm">
                  <div className="text-[10px] uppercase tracking-[0.16em] font-semibold text-primary mb-1">
                    Resolution note
                  </div>
                  <p className="text-foreground/90 leading-relaxed">{c.resolution_notes}</p>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <ModuleFooter />
    </main>
  );
}

function EmptyCard({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-10 text-center space-y-4">
      <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
        <FileText className="h-6 w-6 text-primary" strokeWidth={1.75} />
      </div>
      <h2 className="font-heading text-xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">{body}</p>
      <div className="pt-2">{cta}</div>
    </div>
  );
}