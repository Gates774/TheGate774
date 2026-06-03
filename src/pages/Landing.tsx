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
} from "lucide-react";
import { ActionCard } from "@/components/civic/ActionCard";
import { CivicHero } from "@/components/civic/CivicHero";
import { ModuleFooter } from "@/components/civic/ModuleFooter";
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
    else if (id === "enquiries") navigate("/enquiries");
    else if (id === "reporting") navigate("/reporting");
    else toast("This module ships in the next phase.");
  };
  return (
    <main className="min-h-screen bg-background">
      <Helmet>
        <title>THE GATE® — Civic Gateway to Nigerian Government</title>
        <meta name="description" content="Find the right Nigerian MDA for complaints, requests, enquiries, reporting, applications and registrations across the 774 LGAs." />
        <link rel="canonical" href="https://thegate774app.lovable.app/" />
        <meta property="og:title" content="THE GATE® — Civic Gateway to Nigerian Government" />
        <meta property="og:description" content="Connect with the right Ministry, Department or Agency across the 774 LGAs + 6 Area Councils." />
        <meta property="og:url" content="https://thegate774app.lovable.app/" />
      </Helmet>

      <CivicHero
        pill="Federal Republic of Nigeria · Constitution 1999 (as amended)"
        title="Hello! What do you want to do now?"
        subtitle="Choose a civic action below. We'll route you to the right tier of government — Federal, State or Local — and the responsible MDA."
      />

      {/* ACTION GRID */}
      <section className="container max-w-6xl py-16 md:py-20">
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

      <ModuleFooter />
    </main>
  );
};

export default Landing;
