import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/gate774-logo.webp";

interface Props {
  eyebrow: string;
  title: string;
  description?: string;
}

export function ModuleHeader({ eyebrow, title, description }: Props) {
  return (
    <header className="border-b border-border/60 bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40">
      <div className="container max-w-5xl py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <img src={logo} alt="" aria-hidden="true" className="h-8 w-8 rounded-full" />
          <span className="font-heading font-semibold text-base tracking-tight">THE GATE®</span>
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Back to modules
        </Link>
      </div>
      <div className="container max-w-5xl pb-8 pt-6 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium tracking-[0.14em] uppercase">
          {eyebrow}
        </div>
        <h1 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground max-w-2xl text-[15px] leading-relaxed">{description}</p>
        )}
      </div>
    </header>
  );
}