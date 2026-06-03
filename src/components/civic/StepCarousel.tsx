import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Check, Pause, Play, Clock } from "lucide-react";
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
  /** Default auto-advance delay in ms. 0 = disabled. */
  defaultAutoAdvanceMs?: number;
}

const SPEED_PRESETS = [
  { label: "2s", ms: 2000 },
  { label: "4s", ms: 4000 },
  { label: "8s", ms: 8000 },
  { label: "Manual", ms: 0 },
];

/**
 * Premium animated step wizard.
 * - One step visible at a time with a horizontal slide transition.
 * - Progress header with numbered nodes + connecting rail.
 * - Back / Next controls (Next can be hidden so the last step renders its own CTA).
 * - Auto-advance with pause, speed presets, and a visual countdown bar.
 */
export function StepCarousel({
  steps,
  step,
  onStepChange,
  className,
  defaultAutoAdvanceMs = 4000,
}: StepCarouselProps) {
  const safeStep = Math.max(0, Math.min(step, steps.length - 1));
  const [height, setHeight] = useState<number | "auto">("auto");
  const slidesRef = useRef<Array<HTMLDivElement | null>>([]);

  // Timer state
  const [delayMs, setDelayMs] = useState(defaultAutoAdvanceMs);
  const [paused, setPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const prevCanNextRef = useRef<boolean | undefined>(undefined);

  const current = steps[safeStep];
  const isLast = safeStep === steps.length - 1;
  const canAdvance = Boolean(current.canNext) && !isLast && delayMs > 0;

  // Start / stop timer
  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

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

  // Auto-advance timer logic
  useEffect(() => {
    const justBecameReady = current.canNext && prevCanNextRef.current === false;
    prevCanNextRef.current = current.canNext;

    // Don't run timer if conditions aren't met
    if (!canAdvance || paused) {
      clearTimer();
      setTimeLeft(0);
      return;
    }

    // Only start timer when canNext becomes true (fresh selection) or when delay/pause changes while ready
    if (!justBecameReady && timeLeft === 0) {
      // Timer hasn't been started for this selection yet
    }

    // Always restart timer when entering this effect with canAdvance true
    clearTimer();
    startTimeRef.current = Date.now();
    setTimeLeft(delayMs);

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, delayMs - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearTimer();
        onStepChange(safeStep + 1);
      }
    }, 50);

    return clearTimer;
  }, [safeStep, current.canNext, delayMs, paused, isLast, canAdvance, clearTimer, onStepChange]);

  const handleManualNav = useCallback(
    (newStep: number) => {
      clearTimer();
      setTimeLeft(0);
      onStepChange(newStep);
    },
    [clearTimer, onStepChange]
  );

  const progress = delayMs > 0 && timeLeft > 0 ? (timeLeft / delayMs) * 100 : 0;
  const isTimerActive = canAdvance && !paused && timeLeft > 0;

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
                onClick={() => clickable && handleManualNav(i)}
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

      {/* Countdown bar */}
      <div className="relative h-1 w-full rounded-full bg-border/60 overflow-hidden">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all ease-linear",
            isTimerActive ? "bg-primary" : "bg-transparent"
          )}
          style={{
            width: `${progress}%`,
            transitionDuration: isTimerActive ? "100ms" : "300ms",
          }}
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
          onClick={() => handleManualNav(safeStep - 1)}
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
            onClick={() => handleManualNav(safeStep + 1)}
            disabled={!current.canNext}
            className="rounded-xl gap-1.5 h-10 btn-civic"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <div className="w-[88px]" aria-hidden />
        )}
      </div>

      {/* Timer controls */}
      {delayMs > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          {/* Pause / Play */}
          <button
            type="button"
            onClick={() => {
              setPaused((p) => {
                const next = !p;
                if (!next) {
                  // Resuming: reset timer to full delay for the current selection
                  startTimeRef.current = Date.now();
                  setTimeLeft(delayMs);
                }
                return next;
              });
            }}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-tight border transition-all",
              paused
                ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground",
            )}
            title={paused ? "Resume auto-advance" : "Pause auto-advance"}
          >
            {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            {paused ? "Resume" : "Pause"}
          </button>

          {/* Speed presets */}
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground mr-1" />
            {SPEED_PRESETS.map((preset) => {
              const active = delayMs === preset.ms;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setDelayMs(preset.ms);
                    setPaused(false);
                    setTimeLeft(preset.ms);
                    startTimeRef.current = Date.now();
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-tight border transition-all",
                    active
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
