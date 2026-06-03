import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface CarouselStep {
  id: string;
  label: string;
  /** Required to enable the Next button on this step. Last step often uses its own submit. */
  canNext?: boolean;
  /** Hide the built-in Next button (e.g. last step provides its own submit CTA). */
  hideNext?: boolean;
  content: ReactNode;
}

interface StepCarouselProps {
  steps: CarouselStep[];
  step: number;
  onStepChange: (n: number) => void;
  className?: string;
}

/**
 * Premium animated step wizard.
 * - One step visible at a time with a horizontal slide transition.
 * - Progress header with numbered nodes + connecting rail.
 * - Back / Next controls (Next can be hidden so the last step renders its own CTA).
 */
export function StepCarousel({ steps, step, onStepChange, className }: StepCarouselProps) {
  const safeStep = Math.max(0, Math.min(step, steps.length - 1));
  const [height, setHeight] = useState<number | "auto">("auto");
  const slidesRef = useRef<Array<HTMLDivElement | null>>([]);

  // Measure active slide so the track height animates smoothly.
  useEffect(() => {
    const el = slidesRef.current[safeStep];
    if (!el) return;
    const measure = () => setHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [safeStep]);

  // Scroll the carousel into view on step change for a "slideshow page" feel.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [safeStep]);

  const current = steps[safeStep];
  const isLast = safeStep === steps.length - 1;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Progress header */}
      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          {steps.map((s, i) => {
            const completed = i < safeStep;
            const active = i === safeStep;
            const clickable = i <= safeStep || completed;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => clickable && onStepChange(i)}
                disabled={!clickable}
                className={cn(
                  "group relative z-10 flex items-center gap-2.5 min-w-0",
                  clickable ? "cursor-pointer" : "cursor-not-allowed",
                )}
              >
                <span
                  className={cn(
                    "h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ring-1",
                    active &&
                      "bg-primary text-primary-foreground ring-primary/40 shadow-civic scale-110",
                    completed &&
                      "bg-primary/15 text-primary ring-primary/30",
                    !active && !completed &&
                      "bg-background text-muted-foreground ring-border",
                  )}
                >
                  {completed ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : i + 1}
                </span>
                <span
                  className={cn(
                    "hidden sm:inline-block text-[12px] font-medium tracking-tight truncate transition-colors",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
        {/* Connecting rail */}
        <div className="absolute left-4 right-4 top-4 -z-0 h-px bg-border" aria-hidden />
        <div
          className="absolute left-4 top-4 -z-0 h-px bg-primary transition-all duration-500"
          style={{
            width: `calc(${(safeStep / Math.max(steps.length - 1, 1)) * 100}% - 0px)`,
          }}
          aria-hidden
        />
      </div>

      {/* Slide stage */}
      <div
        className="relative overflow-hidden transition-[height] duration-500 ease-out"
        style={{ height: height === "auto" ? undefined : height }}
      >
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${safeStep * 100}%)` }}
        >
          {steps.map((s, i) => (
            <div
              key={s.id}
              ref={(el) => (slidesRef.current[i] = el)}
              className={cn(
                "w-full shrink-0 px-0.5",
                i === safeStep ? "" : "pointer-events-none",
              )}
              aria-hidden={i !== safeStep}
            >
              {s.content}
            </div>
          ))}
        </div>
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onStepChange(safeStep - 1)}
          disabled={safeStep === 0}
          className="rounded-xl gap-1.5 h-10"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
          Step {safeStep + 1} of {steps.length}
        </div>
        {!current.hideNext && !isLast ? (
          <Button
            type="button"
            onClick={() => onStepChange(safeStep + 1)}
            disabled={!current.canNext}
            className="rounded-xl gap-1.5 h-10 btn-civic"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <div className="w-[88px]" aria-hidden />
        )}
      </div>
    </div>
  );
}