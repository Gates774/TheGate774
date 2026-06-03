import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  Loader2,
  HeartHandshake,
  Plus,
  MapPin,
  Trash2,
  ChevronDown,
  Copy,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { ModuleHeader } from "@/components/civic/ModuleHeader";
import { ModuleFooter } from "@/components/civic/ModuleFooter";
import { ComplaintReportCard, type ComplaintAnalysis } from "@/components/civic/ComplaintReportCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type RequestRow = Database["public"]["Tables"]["service_requests"]["Row"];

const STATUS_LABEL: Record<string, string> = {
  guide_generated: "Guide ready",
  in_progress: "In progress",
  submitted_to_authority: "With authority",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function MyRequests() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

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
        .from("service_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) toast.error(error.message);
      setRows((data ?? []) as RequestRow[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const remove = async (id: string) => {
    const prev = rows;
    setRows(rows.filter((r) => r.id !== id));
    const { error } = await supabase.from("service_requests").delete().eq("id", id);
    if (error) {
      setRows(prev);
      toast.error("Could not delete");
    }
  };

  const copy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Reference code copied");
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary/40 via-background to-background">
      <Helmet>
        <title>My Requests — THE GATE®</title>
        <meta
          name="description"
          content="Revisit every Nigerian government service guide you've generated through THE GATE®, with the responsible MDA and next steps."
        />
      </Helmet>

      <ModuleHeader
        eyebrow="Module 02 · Requests"
        title="My Requests"
        action={
          <Link
            to="/requests"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white/90 hover:text-white bg-white/10 border border-white/25 backdrop-blur-sm hover:border-white/45 transition-all"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} /> New request
          </Link>
        }
      />

      <section className="container max-w-3xl py-10 space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading your requests…
          </div>
        )}

        {!loading && authed === false && (
          <EmptyCard
            title="Sign in to view your requests"
            body="You need to be signed in to see the service guides you've generated."
            cta={
              <Button asChild className="rounded-xl btn-civic">
                <Link to="/auth">Sign in</Link>
              </Button>
            }
          />
        )}

        {!loading && authed && rows.length === 0 && (
          <EmptyCard
            title="No saved requests yet"
            body="Every service guide you generate is saved here so you can return to the MDA contact and next steps."
            cta={
              <Button asChild className="rounded-xl btn-civic gap-2">
                <Link to="/requests">
                  <Plus className="h-4 w-4" /> Start a request
                </Link>
              </Button>
            }
          />
        )}

        {!loading &&
          rows.map((r) => {
            const open = openId === r.id;
            const analysis = (r.ai_analysis ?? null) as ComplaintAnalysis | null;
            const statusLabel = STATUS_LABEL[r.status] ?? r.status;
            return (
              <article
                key={r.id}
                className="rounded-2xl border border-border bg-card overflow-hidden"
              >
                <button
                  onClick={() => setOpenId(open ? null : r.id)}
                  className="w-full text-left p-5 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <Badge variant="outline" className="border-primary/30 text-primary">
                          {r.category_label}
                        </Badge>
                        {r.subcategory_label && (
                          <Badge variant="secondary" className="font-normal">
                            {r.subcategory_label}
                          </Badge>
                        )}
                        <Badge className="bg-primary/10 text-primary border-primary/20 font-normal">
                          {statusLabel}
                        </Badge>
                      </div>
                      <h3 className="font-heading text-base font-semibold leading-snug line-clamp-2">
                        {r.subcategory_label || r.category_label}
                      </h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-muted-foreground">
                        <span className="font-mono">{r.reference_code}</span>
                        <span>
                          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                        </span>
                        {r.lga && r.state && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {r.lga}, {r.state}
                          </span>
                        )}
                        {r.responsible_authority && <span>{r.responsible_authority}</span>}
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>

                {open && (
                  <div className="border-t border-border/60 p-5 space-y-4 bg-muted/10">
                    {r.notes && (
                      <div className="rounded-xl border border-border bg-card p-3 text-sm">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-medium mb-1">
                          Your note
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap">{r.notes}</p>
                      </div>
                    )}
                    {analysis ? (
                      <ComplaintReportCard analysis={analysis} eyebrow="Saved Service Guide" />
                    ) : (
                      <p className="text-sm text-muted-foreground">No saved guide for this request.</p>
                    )}
                    {r.resolution_notes && (
                      <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-medium mb-1">
                          Update from reviewer
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap">{r.resolution_notes}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copy(r.reference_code)}
                        className="rounded-xl gap-1.5 h-8"
                      >
                        <Copy className="h-3.5 w-3.5" /> Copy reference
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => remove(r.id)}
                        className="text-muted-foreground hover:text-destructive gap-1.5 h-8"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
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
        <HeartHandshake className="h-6 w-6 text-primary" strokeWidth={1.75} />
      </div>
      <h2 className="font-heading text-xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">{body}</p>
      <div className="pt-2">{cta}</div>
    </div>
  );
}