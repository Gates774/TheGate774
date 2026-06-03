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

type RegistrationRow = Database["public"]["Tables"]["registrations"]["Row"];

const STATUS_LABEL: Record<string, string> = {
  guide_generated: "Guide ready",
  in_progress: "In progress",
  submitted_to_authority: "Submitted",
  approved: "Approved",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function MyRegistrations() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RegistrationRow[]>([]);
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
        .from("registrations")
        .select("*")
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) toast.error(error.message);
      setRows((data ?? []) as RegistrationRow[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const remove = async (id: string) => {
    const prev = rows;
    setRows(rows.filter((r) => r.id !== id));
    const { error } = await supabase.from("registrations").delete().eq("id", id);
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
        <title>My Registrations — THE GATE®</title>
        <meta
          name="description"
          content="Revisit every Nigerian government document, licence and permit registration guide you've generated through THE GATE®."
        />
      </Helmet>

      <ModuleHeader
        eyebrow="Module 06 · Registration"
        title="My Registrations"
        action={
          <Link
            to="/registration"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white/90 hover:text-white bg-white/10 border border-white/25 backdrop-blur-sm hover:border-white/45 transition-all"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} /> New application
          </Link>
        }
      />

      <section className="container max-w-3xl py-10 space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading your registrations…
          </div>
        )}

        {!loading && authed === false && (
          <EmptyCard
            title="Sign in to view your registrations"
            body="You need to be signed in to see the registration guides you've generated."
            cta={
              <Button asChild className="rounded-xl btn-civic">
                <Link to="/auth">Sign in</Link>
              </Button>
            }
          />
        )}

        {!loading && authed && rows.length === 0 && (
          <EmptyCard
            title="No saved registrations yet"
            body="Every registration guide you generate is saved here so you can return to documents, fees and the issuing office."
            cta={
              <Button asChild className="rounded-xl btn-civic gap-2">
                <Link to="/registration">
                  <Plus className="h-4 w-4" /> Start a registration
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
                      <ComplaintReportCard analysis={analysis} eyebrow="Saved Registration Guide" />
                    ) : (
                      <p className="text-sm text-muted-foreground">No saved guide for this application.</p>
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