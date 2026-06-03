import { ReactNode } from "react";

interface Props {
  /** Small uppercase pill above the title. */
  pill: string;
  /** Big white serif title. */
  title: ReactNode;
  /** Optional sub-headline under the title. */
  subtitle?: ReactNode;
  /** Optional CTAs row below subtitle. */
  ctas?: ReactNode;
  /** Optional element to anchor top-left (e.g. Back button). */
  topLeft?: ReactNode;
}

/**
 * Shared deep-green hero used by Landing and every module page.
 * Solid civic green, subtle diagonal stripes + faint circles, centered.
 */
export function CivicHero({ pill, title, subtitle, ctas, topLeft }: Props) {
  return (
    <header className="relative overflow-hidden text-white">
      {/* Solid civic-green base */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-br from-[hsl(var(--civic-green-dark))] via-primary to-[hsl(var(--civic-green))]"
      />
      {/* Diagonal stripe pattern */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.9) 0 1px, transparent 1px 14px)",
        }}
      />
      {/* Faint concentric circles, right side */}
      <svg
        aria-hidden
        className="pointer-events-none absolute -right-32 top-1/2 -translate-y-1/2 h-[820px] w-[820px] opacity-[0.09]"
        viewBox="0 0 800 800"
        fill="none"
      >
        <circle cx="400" cy="400" r="380" stroke="white" strokeWidth="1.5" />
        <circle cx="400" cy="400" r="300" stroke="white" strokeWidth="1.5" />
        <circle cx="400" cy="400" r="220" stroke="white" strokeWidth="1.5" />
        <circle cx="400" cy="400" r="140" stroke="white" strokeWidth="1.5" />
      </svg>

      {topLeft && (
        <div className="absolute top-5 left-4 md:left-8 z-10">{topLeft}</div>
      )}

      <div className="container max-w-4xl pt-16 md:pt-20 pb-16 md:pb-24 flex flex-col items-center text-center">
        {/* Constitutional pill */}
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/30 bg-white/[0.04] text-[10px] md:text-[11px] font-semibold tracking-[0.18em] uppercase text-white/85 backdrop-blur-sm">
          {pill}
        </span>

        {/* Title — large serif, white */}
        <h1 className="mt-7 font-heading font-bold tracking-tight text-white leading-[1.02] text-5xl md:text-7xl lg:text-[5.5rem] animate-slide-up">
          {title}
        </h1>

        {/* Subtitle */}
        {subtitle && (
          <p className="mt-6 max-w-2xl text-base md:text-lg text-white/80 leading-relaxed">
            {subtitle}
          </p>
        )}

        {/* CTAs */}
        {ctas && <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">{ctas}</div>}
      </div>
    </header>
  );
}