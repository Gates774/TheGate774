import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  MessageSquareWarning,
  HandHelping,
  HelpCircle,
  ShieldAlert,
  FileSignature,
  IdCard,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Sparkles,
} from "lucide-react";
import logo from "@/assets/gate774-logo.webp";
import { ActionCard } from "@/components/civic/ActionCard";
import { ACTION_TYPES } from "@/data/govResponsibilities";

const ICONS = {
  complaints: MessageSquareWarning,
  request: HandHelping,
  enquiries: HelpCircle,
  reporting: ShieldAlert,
  application: FileSignature,
  registration: IdCard,
} as const;

const Landing = () => {
  const navigate = useNavigate();
  const go = (id: string) => {
    if (id === "complaints") navigate("/complaints");
    else if (id === "request") navigate("/requests");
    else toast("This module ships in the next phase.");
  };
  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <Helmet>
        <title>THE GATE® — Civic Gateway to Nigerian Government</title>
        <meta name="description" content="Find the right Nigerian MDA for complaints, requests, enquiries, reporting, applications and registrations across the 774 LGAs." />
        <link rel="canonical" href="https://thegate774app.lovable.app/" />
        <meta property="og:title" content="THE GATE® — Civic Gateway to Nigerian Government" />
        <meta property="og:description" content="Connect with the right Ministry, Department or Agency across the 774 LGAs + 6 Area Councils." />
        <meta property="og:url" content="https://thegate774app.lovable.app/" />
      </Helmet>

      {/* Ambient background — soft green wash + radial glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/60 via-background to-background" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[820px] rounded-full bg-primary/15 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at top, black 30%, transparent 75%)",
          }}
        />
      </div>

      {/* Top utility bar */}
      <div className="border-b border-border/60 bg-background/70 backdrop-blur-md">
        <div className="container flex items-center justify-between py-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" /> 774 LGAs + 6 Area Councils</span>
          <span className="hidden sm:flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Constitutionally grounded · Citizen-first</span>
        </div>
      </div>

      {/* HERO */}
      <section className="container max-w-5xl pt-16 md:pt-24 pb-12 text-center">
        {/* Centered logo */}
        <div className="flex flex-col items-center animate-fade-in">
          <div className="relative">
            <div className="absolute inset-0 -m-6 rounded-full bg-primary/20 blur-2xl animate-pulse" />
            <div className="relative h-28 w-28 md:h-32 md:w-32 rounded-full bg-white ring-4 ring-primary/15 shadow-civic flex items-center justify-center overflow-hidden">
              <img src={logo} alt="THE GATE logo" className="h-24 w-24 md:h-28 md:w-28 object-contain" />
            </div>
          </div>
          <div className="mt-5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold tracking-[0.18em] uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            Universal Participation · The Collectives
          </div>
        </div>

        <h1 className="mt-8 font-heading text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight animate-slide-up">
          Hello! <span className="text-gradient-civic">What do you want</span> to do now?
        </h1>
        <p className="mt-5 max-w-2xl mx-auto text-base md:text-lg text-muted-foreground animate-fade-in">
          Choose a civic action below. We will route you to the right tier of government — Federal, State, or Local — and the responsible Ministry, Department or Agency.
        </p>

        {/* Decorative green-white bar */}
        <div className="mt-10 flex items-center justify-center gap-1.5" aria-hidden>
          <span className="h-1 w-12 rounded-full bg-primary" />
          <span className="h-1 w-6 rounded-full bg-primary/40" />
          <span className="h-1 w-3 rounded-full bg-primary/20" />
        </div>
      </section>

      {/* ACTION GRID */}
      <section className="container max-w-6xl pb-24">
        <h2 className="sr-only">Choose a civic action</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {ACTION_TYPES.map((a, i) => (
            <div
              key={a.id}
              className="animate-slide-up"
              style={{ animationDelay: `${i * 70}ms`, animationFillMode: "backwards" }}
            >
              <ActionCard
                id={a.id}
                label={a.label}
                desc={a.desc}
                icon={ICONS[a.id]}
                onClick={() => go(a.id)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* PREMIUM FOOTER */}
      <footer className="relative mt-8 text-primary-foreground">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[hsl(var(--civic-green-dark))] via-primary to-[hsl(var(--civic-green-light))]" />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="container py-14 grid gap-10 md:grid-cols-3">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-lg">
                <img src={logo} alt="" aria-hidden="true" className="h-10 w-10 object-contain" />
              </div>
              <div>
                <div className="font-heading text-xl font-semibold">THE GATE<span className="align-super text-[10px]">®</span></div>
                <div className="text-xs text-white/70">Universal Participation · The Collectives</div>
              </div>
            </div>
            <p className="text-sm text-white/80 leading-relaxed max-w-sm">
              A Common Operating Platform bridging citizens and government across the 774 Local Government Areas and 6 Area Councils of Nigeria.
            </p>
          </div>

          <div>
            <div className="text-xs font-semibold tracking-[0.18em] uppercase text-white/60 mb-4">Civic Actions</div>
            <ul className="space-y-2 text-sm">
              {ACTION_TYPES.slice(0, 6).map((a) => (
                <li key={a.id}>
                  <button
                    onClick={() => go(a.id)}
                    className="text-white/85 hover:text-white inline-flex items-center gap-1.5 group"
                  >
                    {a.label}
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-xs font-semibold tracking-[0.18em] uppercase text-white/60 mb-4">Framework</div>
            <ul className="space-y-2 text-sm text-white/85">
              <li className="flex items-start gap-2"><ShieldCheck className="h-4 w-4 mt-0.5 text-white" /> Grounded in the 1999 Constitution</li>
              <li className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 text-white" /> Exclusive · Concurrent · Residual lists</li>
              <li className="flex items-start gap-2"><Sparkles className="h-4 w-4 mt-0.5 text-white" /> AI-routed to the responsible MDA</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/15">
          <div className="container py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/70">
            <span>© {new Date().getFullYear()} THE GATE® — Civic engagement for every Nigerian.</span>
            <span className="tracking-wide">Built for the Collectives · Powered by THE GATE®</span>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default Landing;
