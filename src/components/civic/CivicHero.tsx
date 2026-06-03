import { ReactNode } from "react";

interface Props {
  /** Small uppercase pill above the title. Accepts a string or any node (e.g. a logo). */
  pill?: ReactNode;
  /** Big white serif title. Pass null to render no title (compact / logo-only headers). */
  title?: ReactNode;
  /** Optional sub-headline under the title. */
  subtitle?: ReactNode;
  /** Optional CTAs row below subtitle. */
  ctas?: ReactNode;
  /** Optional element to anchor top-left (e.g. Back button). */
  topLeft?: ReactNode;
  /** Optional element to anchor top-right (e.g. secondary action). */
  topRight?: ReactNode;
  /** Compact variant — tighter vertical padding for inner module pages. */
  compact?: boolean;
}

/**
 * Shared deep-green hero used by Landing and every module page.
 * Solid civic green, subtle diagonal stripes + faint circles, centered.
 */
export function CivicHero({ pill, title, subtitle, ctas, topLeft, topRight, compact }: Props) {
  return (
    <header
      className="relative overflow-hidden text-white border-b-4 border-[hsl(var(--accent))]"
      style={{
        background:
          "linear-gradient(135deg, hsl(var(--civic-green-dark)) 0%, hsl(var(--civic-green)) 55%, hsl(var(--civic-green-light)) 100%)",
      }}
    >
      {/* Diagonal stripe pattern (stronger) */}
      <div
        aria-hidden
        className="absolute inset-0 -z-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.9) 0 1px, transparent 1px 14px)",
        }}
      />
      {/* Top glow */}
      <div
        aria-hidden
        className="absolute -top-32 left-1/2 -translate-x-1/2 h-72 w-[900px] rounded-full bg-white/10 blur-3xl"
      />
      {/* Faint concentric circles, right side */}
      <svg
        aria-hidden
        className="pointer-events-none absolute -right-32 top-1/2 -translate-y-1/2 h-[820px] w-[820px] opacity-[0.16]"
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
      {topRight && (
        <div className="absolute top-5 right-4 md:right-8 z-10">{topRight}</div>
      )}

      <div
        className={
          compact
            ? "container max-w-4xl pt-10 md:pt-14 pb-10 md:pb-14 flex flex-col items-center text-center"
            : "container max-w-4xl pt-16 md:pt-20 pb-16 md:pb-24 flex flex-col items-center text-center"
        }
      >
        {/* Pill slot — string renders as a constitutional pill, node renders as-is (e.g. a logo). */}
        {typeof pill === "string" ? (
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/30 bg-white/[0.04] text-[10px] md:text-[11px] font-semibold tracking-[0.18em] uppercase text-white/85 backdrop-blur-sm">
            {pill}
          </span>
        ) : (
          pill
        )}

        {/* Title — large serif, white */}
        {title != null && title !== false && (
          <h1 className="mt-7 font-heading font-bold tracking-tight text-white leading-[1.02] text-5xl md:text-7xl lg:text-[5.5rem] animate-slide-up">
            {title}
          </h1>
        )}

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