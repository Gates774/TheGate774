import { ArrowUpRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  id: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  onClick: () => void;
}

export function ActionCard({ label, desc, icon: Icon, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full text-left p-6 rounded-2xl border border-border bg-card overflow-hidden",
        "hover:border-primary/50 transition-all duration-500 hover:-translate-y-1.5",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-civic"
      )}
    >
      {/* hover wash */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/[0.04] via-transparent to-primary/[0.08]"
      />
      {/* corner accent */}
      <div
        aria-hidden
        className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      />

      <div className="relative flex items-start justify-between mb-5">
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-[hsl(var(--civic-green-light))] text-primary-foreground flex items-center justify-center shadow-civic">
            <Icon className="h-6 w-6" strokeWidth={1.75} />
          </div>
        </div>
        <ArrowUpRight
          className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-300"
          strokeWidth={1.75}
        />
      </div>

      <h3 className="relative font-heading text-xl font-semibold mb-1.5 tracking-tight">{label}</h3>
      <p className="relative text-sm text-muted-foreground leading-relaxed">{desc}</p>

      {/* bottom accent line */}
      <div
        aria-hidden
        className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
      />
    </button>
  );
}