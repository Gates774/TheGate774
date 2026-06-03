import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { CivicHero } from "@/components/civic/CivicHero";

interface Props {
  eyebrow: string;
  title: string;
  /** Optional. Kept for backward-compat — not rendered in the premium header. */
  description?: string;
  /** Optional secondary action rendered in the top-right of the hero. */
  action?: ReactNode;
}

export function ModuleHeader({ eyebrow, title, action }: Props) {
  return (
    <CivicHero
      pill={eyebrow}
      title={title}
      topLeft={
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-white/85 hover:text-white bg-white/5 border border-white/20 backdrop-blur-sm hover:border-white/40 transition-all"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Back to modules
        </Link>
      }
      topRight={action}
    />
  );
}