import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/gate774-logo.webp";

interface Props {
  eyebrow: string;
  title: string;
  /** Optional. Kept for backward-compat — not rendered in the premium header. */
  description?: string;
}

export function ModuleHeader({ eyebrow, title }: Props) {
  return (
    <header className="relative border-b border-border/60 overflow-hidden">
      {/* Ambient backdrop */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/60 via-background to-background" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-80 w-[640px] rounded-full bg-primary/15 blur-3xl" />
      </div>

      {/* Floating Back button */}
      <Link
        to="/"
        className="absolute top-5 left-4 md:left-8 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:text-primary bg-card/70 border border-border/60 backdrop-blur-sm hover:border-primary/40 transition-all"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Back to modules
      </Link>

      <div className="container max-w-5xl pt-14 md:pt-16 pb-10 flex flex-col items-center text-center">
        {/* Centered logo */}
        <div className="relative animate-fade-in">
          <div className="absolute inset-0 -m-4 rounded-full bg-primary/20 blur-2xl animate-pulse" />
          <div className="relative h-20 w-20 md:h-24 md:w-24 rounded-full bg-white ring-4 ring-primary/15 shadow-civic flex items-center justify-center overflow-hidden">
            <img src={logo} alt="THE GATE logo" className="h-16 w-16 md:h-20 md:w-20 object-contain" />
          </div>
        </div>

        <div className="mt-5 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold tracking-[0.18em] uppercase">
          {eyebrow}
        </div>

        <h1 className="mt-3 font-heading text-3xl md:text-5xl font-semibold tracking-tight leading-tight animate-slide-up">
          {title}
        </h1>

        <div className="mt-5 flex items-center justify-center gap-1.5" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-primary" />
          <span className="h-1 w-5 rounded-full bg-primary/40" />
          <span className="h-1 w-2.5 rounded-full bg-primary/20" />
        </div>
      </div>
    </header>
  );
}