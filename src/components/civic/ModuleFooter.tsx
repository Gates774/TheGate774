import { Apple, Play, Sparkles } from "lucide-react";

export function ModuleFooter() {
  return (
    <footer className="relative mt-16 text-primary-foreground overflow-hidden">
      {/* Deep green base + soft vignette */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-br from-[hsl(var(--civic-green-dark))] via-primary to-[hsl(var(--civic-green-dark))]" />
      <div aria-hidden className="absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-[900px] rounded-full bg-white/10 blur-3xl" />
      <Sparkles
        aria-hidden
        className="absolute top-10 left-10 h-6 w-6 text-white/30"
        strokeWidth={1.25}
      />

      <div className="container max-w-3xl py-20 md:py-24 flex flex-col items-center text-center gap-6">
        {/* Pill */}
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/25 bg-white/5 text-[12px] font-medium text-white/85 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Coming soon on iOS &amp; Android
        </span>

        {/* Headline */}
        <h2 className="font-heading text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05] text-white">
          Civic power, in your pocket.
        </h2>

        {/* Subline */}
        <p className="text-[15px] md:text-base text-white/75 max-w-xl leading-relaxed">
          The THE GATE® mobile app is on the way — built for every Nigerian, in every LGA.
        </p>

        {/* Store buttons */}
        <div className="mt-3 flex flex-col sm:flex-row items-center gap-3">
          <StoreButton
            icon={<Apple className="h-7 w-7" strokeWidth={1.5} fill="currentColor" />}
            small="Coming Soon"
            big="App Store"
          />
          <StoreButton
            icon={<Play className="h-7 w-7" strokeWidth={1.5} fill="currentColor" />}
            small="Coming Soon"
            big="Google Play"
          />
        </div>

        {/* Microcopy */}
        <p className="mt-2 text-[12px] tracking-wide text-white/55">
          Free · Constitutionally grounded · Built for the Collectives
        </p>
      </div>
    </footer>
  );
}

function StoreButton({
  icon,
  small,
  big,
}: {
  icon: React.ReactNode;
  small: string;
  big: string;
}) {
  return (
    <button
      type="button"
      disabled
      aria-label={`${big} — ${small}`}
      className="group relative flex items-center gap-3 px-5 py-3 rounded-2xl bg-white text-foreground shadow-xl hover:shadow-2xl transition-all cursor-not-allowed opacity-95"
    >
      {icon}
      <div className="flex flex-col items-start leading-tight text-left">
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{small}</span>
        <span className="font-heading text-lg font-semibold -mt-0.5">{big}</span>
      </div>
    </button>
  );
}