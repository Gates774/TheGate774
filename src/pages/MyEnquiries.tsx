import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Loader2, HelpCircle, Plus, MapPin, ThumbsUp, ThumbsDown, Trash2, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { ModuleHeader } from "@/components/civic/ModuleHeader";
import { ModuleFooter } from "@/components/civic/ModuleFooter";
import { ComplaintReportCard, type ComplaintAnalysis } from "@/components/civic/ComplaintReportCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type EnquiryRow = Database["public"]["Tables"]["enquiries"]["Row"];

export default function MyEnquiries() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<EnquiryRow[]>([]);
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
        .from("enquiries")
        .select("*")
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) toast.error(error.message);
      setRows((data ?? []) as EnquiryRow[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const remove = async (id: string) => {
    const prev = rows;
    setRows(rows.filter((r) => r.id !== id));
    const { error } = await supabase.from("enquiries").delete().eq("id", id);
    if (error) {
      setRows(prev);
      toast.error("Could not delete");
    }
  };

  const rate = async (id: string, value: 1 | -1) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, helpful_rating: value } : r)));
    await supabase.from("enquiries").update({ helpful_rating: value }).eq("id", id);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary/40 via-background to-background">
      <Helmet>
        <title>My Enquiries — THE GATE®</title>
        <meta name="description" content="Revisit every enquiry you've asked through THE GATE® with the full civic answer and source authority." />
      </Helmet>

      <ModuleHeader
        eyebrow="Module 03 · Enquiries"
        title="My Enquiries"
        action={
          <Link
            to="/enquiries"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white/90 hover:text-white bg-white/10 border border-white/25 backdrop-blur-sm hover:border-white/45 transition-all"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} /> Ask a new one
          </Link>
        }
      />

      <section className="container max-w-3xl py-10 space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading your enquiries…
          </div>
        )}

        {!loading && authed === false && (
          <EmptyCard
            title="Sign in to view your enquiries"
            body="You need to be signed in to see the enquiries you've asked."
            cta={<Button asChild className="rounded-xl btn-civic"><Link to="/auth">Sign in</Link></Button>}
          />
        )}

        {!loading && authed && rows.length === 0 && (
          <EmptyCard
            title="No enquiries yet"
            body="Every question you ask through THE GATE® will be saved here so you can revisit the answer and the source authority."
            cta={
              <Button asChild className="rounded-xl btn-civic gap-2">
                <Link to="/enquiries"><Plus className="h-4 w-4" /> Ask your first question</Link>
              </Button>
            }
          />
        )}

        {!loading && rows.map((e) => {
          const open = openId === e.id;
          const analysis = (e.ai_analysis ?? null) as ComplaintAnalysis | null;
          return (
            <article key={e.id} className="rounded-2xl border border-border bg-card overflow-hidden">
              <button
                onClick={() => setOpenId(open ? null : e.id)}
                className="w-full text-left p-5 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <Badge variant="outline" className="border-primary/30 text-primary">
                        {e.category_label}
                      </Badge>
                      {e.subcategory_label && (
                        <Badge variant="secondary" className="font-normal">
                          {e.subcategory_label}
                        </Badge>
                      )}
                      {e.helpful_rating === 1 && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-primary">
                          <ThumbsUp className="h-3 w-3" /> Helpful
                        </span>
                      )}
                      {e.helpful_rating === -1 && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <ThumbsDown className="h-3 w-3" /> Not helpful
                        </span>
                      )}
                    </div>
                    <h3 className="font-heading text-base font-semibold leading-snug line-clamp-2">
                      {e.question || e.subcategory_label || e.category_label}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-muted-foreground">
                      <span>{formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</span>
                      {e.lga && e.state && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {e.lga}, {e.state}
                        </span>
                      )}
                      {e.responsible_authority && <span>{e.responsible_authority}</span>}
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </div>
              </button>

              {open && (
                <div className="border-t border-border/60 p-5 space-y-4 bg-muted/10">
                  {analysis ? (
                    <ComplaintReportCard analysis={analysis} eyebrow="Saved Civic Answer" />
                  ) : (
                    <p className="text-sm text-muted-foreground">No saved answer for this enquiry.</p>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={e.helpful_rating === 1 ? "default" : "outline"}
                        onClick={() => rate(e.id, 1)}
                        className="rounded-xl gap-1.5 h-8"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" /> Helpful
                      </Button>
                      <Button
                        size="sm"
                        variant={e.helpful_rating === -1 ? "default" : "outline"}
                        onClick={() => rate(e.id, -1)}
                        className="rounded-xl gap-1.5 h-8"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" /> Not helpful
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => remove(e.id)}
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
        <HelpCircle className="h-6 w-6 text-primary" strokeWidth={1.75} />
      </div>
      <h2 className="font-heading text-xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">{body}</p>
      <div className="pt-2">{cta}</div>
    </div>
  );
}