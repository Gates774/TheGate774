import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const ADMIN_TOKEN_KEY = "gate_admin_token";
export const ADMIN_TOKEN_EXP_KEY = "gate_admin_token_exp";
export const ADMIN_PASSCODE_KEY = "gate_admin_passcode";

export default function AdminEntry() {
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-verify", {
        body: { passcode },
      });
      if (error || !data?.ok) {
        toast.error("Incorrect passcode");
        setPasscode("");
        return;
      }
      const expiresAt = Date.now() + (data.expiresIn ?? 28800) * 1000;
      sessionStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      sessionStorage.setItem(ADMIN_TOKEN_EXP_KEY, String(expiresAt));
      sessionStorage.setItem(ADMIN_PASSCODE_KEY, passcode);
      toast.success("Access granted");
      navigate("/admin/inbox", { replace: true });
    } catch (err) {
      toast.error("Verification failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <Helmet>
        <title>Admin Access — THE GATE®</title>
        <meta name="description" content="Restricted administrator entry for THE GATE® civic engagement platform." />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://thegate774app.lovable.app/admin" />
        <meta property="og:title" content="Admin Access — THE GATE®" />
        <meta property="og:description" content="Restricted administrator entry for THE GATE®." />
        <meta property="og:url" content="https://thegate774app.lovable.app/admin" />
      </Helmet>
      <Card className="w-full max-w-md border-border/60 shadow-lg">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" strokeWidth={1.75} />
          </div>
          <CardTitle>Admin Access</CardTitle>
          <CardDescription>
            Enter the administrator passcode to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="passcode">Passcode</Label>
              <Input
                id="passcode"
                type="password"
                autoComplete="current-password"
                autoFocus
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !passcode.trim()}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
                </>
              ) : (
                "Unlock Admin"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

export function isAdminAuthenticated() {
  const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  const exp = Number(sessionStorage.getItem(ADMIN_TOKEN_EXP_KEY) ?? 0);
  if (!token || !exp) return false;
  if (Date.now() > exp) {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_TOKEN_EXP_KEY);
    sessionStorage.removeItem(ADMIN_PASSCODE_KEY);
    return false;
  }
  return true;
}