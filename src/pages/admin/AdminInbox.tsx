import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, LogOut, RefreshCw, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { isAdminAuthenticated, ADMIN_TOKEN_KEY, ADMIN_TOKEN_EXP_KEY, ADMIN_PASSCODE_KEY } from "./AdminEntry";
import { LEVEL_LABELS, type GovLevel } from "@/data/govResponsibilities";

interface Report {
  id: string;
  action_type: string;
  full_name: string;
  phone: string;
  origin_state: string | null;
  origin_lga: string | null;
  residence_state: string | null;
  residence_lga: string | null;
  content: string;
  evidence_urls: string[] | null;
  ai_analysis: Record<string, unknown> | null;
  status: string;
  created_at: string;
}

const STATUSES = ["new", "in_review", "routed", "resolved", "closed"] as const;

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reports`;

async function callAdmin(path: string, init: RequestInit = {}) {
  const passcode = sessionStorage.getItem(ADMIN_PASSCODE_KEY) ?? "";
  return fetch(`${FN_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      "Content-Type": "application/json",
      "x-admin-passcode": passcode,
    },
  });
}

export default function AdminInbox() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Report | null>(null);

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      navigate("/admin", { replace: true });
      return;
    }
    load();
  }, [navigate]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await callAdmin("");
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed to load");
      setReports(json.data as Report[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await callAdmin(`?id=${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Update failed");
      toast.success("Status updated");
      setReports((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
      if (selected?.id === id) setSelected({ ...selected, status });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const logout = () => {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_TOKEN_EXP_KEY);
    sessionStorage.removeItem(ADMIN_PASSCODE_KEY);
    navigate("/admin");
  };

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background sticky top-0 z-10">
        <div className="container py-4 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-xl font-semibold">Admin Inbox</h1>
            <p className="text-xs text-muted-foreground">{reports.length} report(s)</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={load} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={logout} className="gap-2">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-6 grid lg:grid-cols-[1fr_2fr] gap-6">
        <div className="space-y-2 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-thin pr-1">
          {loading ? (
            <div className="py-16 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : reports.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No reports yet
            </CardContent></Card>
          ) : (
            reports.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className={`w-full text-left p-3 rounded-lg border transition ${
                  selected?.id === r.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Badge variant="outline" className="text-xs capitalize">{r.action_type}</Badge>
                  <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                </div>
                <div className="font-medium text-sm truncate">{r.full_name}</div>
                <div className="text-xs text-muted-foreground truncate">{r.content}</div>
                <div className="mt-1.5 flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">{r.status}</Badge>
                  <span className="text-[10px] text-muted-foreground truncate">{r.residence_lga}, {r.residence_state}</span>
                </div>
              </button>
            ))
          )}
        </div>

        <div>
          {selected ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="capitalize">{selected.action_type}</CardTitle>
                    <CardDescription>
                      From {selected.full_name} · {selected.phone} · {new Date(selected.created_at).toLocaleString()}
                    </CardDescription>
                  </div>
                  <Select value={selected.status} onValueChange={(v) => updateStatus(selected.id, v)}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <Section label="Message">
                  <p className="text-sm whitespace-pre-wrap">{selected.content}</p>
                </Section>

                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <Field label="Origin" value={`${selected.origin_lga ?? "—"}, ${selected.origin_state ?? "—"}`} />
                  <Field label="Residence" value={`${selected.residence_lga ?? "—"}, ${selected.residence_state ?? "—"}`} />
                </div>

                {selected.ai_analysis && (
                  <Section label="AI Analysis">
                    <div className="rounded-lg border border-border p-3 bg-muted/30 space-y-1 text-sm">
                      {(["level","category","mda","officer","contact"] as const).map((k) => {
                        const v = (selected.ai_analysis as Record<string, unknown>)[k];
                        if (!v) return null;
                        const display = k === "level" ? LEVEL_LABELS[v as GovLevel] ?? String(v) : String(v);
                        return <div key={k}><span className="text-muted-foreground capitalize">{k}: </span><span className="font-medium">{display}</span></div>;
                      })}
                      {(selected.ai_analysis as { rationale?: string }).rationale && (
                        <p className="pt-2 text-foreground/80">{(selected.ai_analysis as { rationale: string }).rationale}</p>
                      )}
                    </div>
                  </Section>
                )}

                {(selected.evidence_urls?.length ?? 0) > 0 && (
                  <Section label="Evidence">
                    <div className="grid grid-cols-3 gap-2">
                      {selected.evidence_urls!.map((u) => (
                        <a key={u} href={u} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden border border-border bg-muted block">
                          {/\.(mp4|mov|webm)$/i.test(u) ? (
                            <video src={u} className="h-full w-full object-cover" />
                          ) : (
                            <img src={u} alt="evidence" className="h-full w-full object-cover" />
                          )}
                        </a>
                      ))}
                    </div>
                  </Section>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="py-24 text-center text-sm text-muted-foreground">
              Select a report to view details
            </CardContent></Card>
          )}
        </div>
      </div>
    </main>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{label}</div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-muted/40">
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}