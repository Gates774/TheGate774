import type { ReactNode } from "react";
import { CivicHero } from "@/components/civic/CivicHero";
import gate774Logo from "@/assets/gate774-logo.png.asset.json";

interface Props {
  /** Kept for backward-compat — no longer rendered. */
  eyebrow?: string;
  /** Kept for backward-compat — no longer rendered as a heading; used only as accessible title. */
  title?: string;
  /** Optional. Kept for backward-compat — not rendered in the premium header. */
  description?: string;
  /** Optional secondary action rendered in the top-right of the hero. */
  action?: ReactNode;
}

/**
 * Premium, minimal module header.
 * Centered brand emblem only — no back link, no module label, no heading text.
 */
export function ModuleHeader({ title, action }: Props) {
  return (
    <CivicHero
      compact
      pill={
        <div className="relative flex items-center justify-center">
          <span
            aria-hidden
            className="absolute inset-0 -m-4 sm:-m-5 md:-m-6 rounded-full bg-[hsl(var(--accent))]/20 blur-2xl"
          />
          <span
            aria-hidden
            className="absolute inset-0 -m-1.5 sm:-m-2 rounded-full ring-1 ring-white/20"
          />
          <img
            src={gate774Logo.url}
            alt={title ? `${title} — THE GATE® 774` : "THE GATE® 774"}
            className="relative h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.4)] animate-fade-in"
            loading="eager"
            decoding="async"
          />
        </div>
      }
      title={null}
      topRight={action}
    />
  );
}