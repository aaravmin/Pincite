// Readiness across the lifecycle - a stepped timeline of the application's life,
// current stage lit, with an optional next-deadline reference marker pinned to
// its rule. Prop-only, progress-driven; the same visual serves the site and the
// Remotion demo. Stage colors stay neutral (this is progress, not pass/fail);
// only the deadline marker uses attention (yellow), never red for decoration.

import { cn } from "@/lib/utils";
import { clamp01, stagger } from "./types";

export type LifecycleStage = {
  key: string;
  label: string;
};

export const DEFAULT_LIFECYCLE: LifecycleStage[] = [
  { key: "draft", label: "Draft" },
  { key: "filed", label: "Filed" },
  { key: "office_action", label: "Office action" },
  { key: "allowed", label: "Allowed" },
  { key: "granted", label: "Granted" },
];

export type LifecycleTimelineProps = {
  stages?: LifecycleStage[];
  /** index of the current stage (0-based) */
  currentIndex: number;
  /** short caption for the lit stage, e.g. the detected stage label */
  currentDetail?: string;
  /** a reference marker on the next step, e.g. a deadline string */
  nextMarker?: { label: string; detail?: string } | null;
  progress?: number;
  className?: string;
};

export function LifecycleTimeline({
  stages = DEFAULT_LIFECYCLE,
  currentIndex,
  currentDetail,
  nextMarker,
  progress = 1,
  className,
}: LifecycleTimelineProps) {
  const p = clamp01(progress);
  const done = clamp01(currentIndex / Math.max(1, stages.length - 1));

  return (
    <div className={cn("w-full", className)}>
      <div className="relative">
        {/* base rail */}
        <div className="absolute left-0 right-0 top-[11px] h-0.5 rounded-full bg-border" aria-hidden />
        {/* progressed rail (neutral) */}
        <div
          className="absolute left-0 top-[11px] h-0.5 rounded-full bg-foreground"
          style={{ width: `${done * 100 * p}%` }}
          aria-hidden
        />
        <ol className="relative flex justify-between">
          {stages.map((stage, i) => {
            const sp = stagger(p, i, stages.length, 0.6);
            const isDone = i < currentIndex;
            const isCurrent = i === currentIndex;
            const isNext = i === currentIndex + 1;
            return (
              <li key={stage.key} className="flex flex-col items-center gap-2" style={{ opacity: sp }}>
                <span
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "z-10 flex size-6 items-center justify-center rounded-full border-2 bg-background text-[10px] font-semibold transition-colors",
                    isDone && "border-foreground bg-foreground text-background",
                    isCurrent && "border-foreground ring-4 ring-foreground/10",
                    !isDone && !isCurrent && "border-border text-muted-foreground",
                    isNext && nextMarker && "border-attention",
                  )}
                >
                  {isDone ? "✓" : i + 1}
                </span>
                <span
                  className={cn(
                    "max-w-[72px] text-center text-[11px] leading-tight",
                    isCurrent ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {stage.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {(currentDetail || nextMarker) && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          {currentDetail ? (
            <span className="text-muted-foreground">
              Now <span className="font-medium text-foreground">{currentDetail}</span>
            </span>
          ) : (
            <span />
          )}
          {nextMarker ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-attention bg-attention-bg px-2.5 py-1 text-attention-foreground">
              <span className="size-2 rounded-full border-2 border-attention" aria-hidden />
              {nextMarker.label}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
