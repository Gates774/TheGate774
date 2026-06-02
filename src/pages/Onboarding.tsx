import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NIGERIA_STATES } from "@/data/nigeriaStates";
import { setSession, getSession } from "@/lib/session";
import { ACTION_TYPES } from "@/data/govResponsibilities";

export default function Onboarding() {
  const { action } = useParams();
  const navigate = useNavigate();
  const existing = getSession();
  const actionMeta = ACTION_TYPES.find((a) => a.id === action);

  const [form, setForm] = useState({
    fullName: existing?.fullName ?? "",
    phone: existing?.phone ?? "",
    originState: existing?.originState ?? "",
    originLga: existing?.originLga ?? "",
    residenceState: existing?.residenceState ?? "",
    residenceLga: existing?.residenceLga ?? "",
  });

  const valid =
    form.fullName.trim().length >= 2 &&
    /^\+?\d{7,15}$/.test(form.phone.replace(/\s/g, "")) &&
    form.originState &&
    form.originLga.trim() &&
    form.residenceState &&
    form.residenceLga.trim();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSession(form);
    navigate(`/workspace/${action}`);
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <Helmet>
        <title>Tell us about yourself — THE GATE®</title>
        <meta name="description" content="Provide your basic identity and location so THE GATE® can route your civic matter to the correct Nigerian authority." />
        <link rel="canonical" href={`https://connect-lga.lovable.app/start/${action ?? ""}`} />
        <meta property="og:title" content="Tell us about yourself — THE GATE®" />
        <meta property="og:description" content="A quick step before we route your civic matter — no account, no password." />
        <meta property="og:url" content={`https://connect-lga.lovable.app/start/${action ?? ""}`} />
      </Helmet>
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <h1 className="font-heading text-3xl font-semibold tracking-tight mb-6">
          Tell us about yourself
        </h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Tell us a little about you</CardTitle>
            <CardDescription>
              {actionMeta ? `For your ${actionMeta.label.toLowerCase()}, ` : ""}we just
              need basic details so we can route your matter correctly. No account, no password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input id="phone" inputMode="tel" placeholder="e.g. 08012345678" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <StatePicker label="State of Origin" value={form.originState} onChange={(v) => setForm({ ...form, originState: v })} />
                <div className="space-y-2">
                  <Label htmlFor="originLga">LGA of Origin</Label>
                  <Input id="originLga" value={form.originLga} onChange={(e) => setForm({ ...form, originLga: e.target.value })} />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <StatePicker label="State of Residence" value={form.residenceState} onChange={(v) => setForm({ ...form, residenceState: v })} />
                <div className="space-y-2">
                  <Label htmlFor="residenceLga">LGA of Residence</Label>
                  <Input id="residenceLga" value={form.residenceLga} onChange={(e) => setForm({ ...form, residenceLga: e.target.value })} />
                </div>
              </div>

              <Button type="submit" className="w-full gap-2" disabled={!valid}>
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function StatePicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
        <SelectContent className="max-h-64">
          {NIGERIA_STATES.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}