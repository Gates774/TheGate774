import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  MessageSquareWarning,
  HandHelping,
  HelpCircle,
  ShieldAlert,
  FileSignature,
  IdCard,
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
  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary/40 via-background to-background">
      <Helmet>
        <title>THE GATE® — Civic Gateway to Nigerian Government</title>
        <meta name="description" content="Find the right Nigerian MDA for complaints, requests, enquiries, reporting, applications and registrations across the 774 LGAs." />
        <link rel="canonical" href="https://thegate774app.lovable.app/" />
        <meta property="og:title" content="THE GATE® — Civic Gateway to Nigerian Government" />
        <meta property="og:description" content="Connect with the right Ministry, Department or Agency across the 774 LGAs + 6 Area Councils." />
        <meta property="og:url" content="https://thegate774app.lovable.app/" />
      </Helmet>
      <header className="container py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="" aria-hidden="true" className="h-10 w-10 rounded-full" />
          <span className="font-heading font-semibold text-lg">THE GATE®</span>
        </div>
        <button
          onClick={() => navigate("/admin")}
          className="text-sm text-muted-foreground hover:text-foreground transition"
        >
          Admin
        </button>
      </header>

      <section className="container max-w-5xl py-12 md:py-20 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium tracking-wide uppercase">
          Universal Participation · The Collectives
        </div>
        <h1 className="font-heading text-4xl md:text-6xl font-semibold tracking-tight">
          THE GATE® — <span className="text-gradient-civic">Your Civic Gateway</span> to Nigerian Government Services
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg">
          Find the right Ministry, Department or Agency for any civic action — from
          registration and applications to complaints and reporting. Powered by an AI
          that understands the Nigerian Constitution.
        </p>
      </section>

      <section className="container max-w-6xl pb-24">
        <h2 className="sr-only">Choose a civic action</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {ACTION_TYPES.map((a) => (
            <ActionCard
              key={a.id}
              id={a.id}
              label={a.label}
              desc={a.desc}
              icon={ICONS[a.id]}
              onClick={() => navigate(`/start/${a.id}`)}
            />
          ))}
        </div>
      </section>

      <footer className="container py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} THE GATE® · Civic engagement for the 774 LGAs + 6 Area Councils
      </footer>
    </main>
  );
};

export default Landing;
