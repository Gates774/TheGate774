import { LucideIcon } from "lucide-react";
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
        "group relative text-left p-6 rounded-2xl border border-border bg-card",
        "hover:border-primary/40 hover:shadow-elevated transition-all duration-300",
        "hover:-translate-y-1"
      )}
    >
      <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        <Icon className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <h3 className="font-heading text-lg font-semibold mb-1">{label}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </button>
  );
}