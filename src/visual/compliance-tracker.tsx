"use client";

// The star element. A row of red/yellow/green status blocks, one per check or
// rule that applies to this application - the patent analogue of a period-by-
// period compliance visual. Prop-only: blocks + reveal `progress` + `activeId`.
// Hover is emitted via `onHover`; the parent renders the finding preview.

import { cn } from "@/lib/utils";
import { SIGNAL, clamp01, stagger, type Signal } from "./types";
import { SignalMark } from "./signal";

export type TrackerBlock = {
  id: string;
  signal: Signal;
  /** short label, e.g. a check name or rule number */
  label: string;
  /** optional one-line detail surfaced on hover by the parent */
  detail?: string;
};

export type ComplianceTrackerProps = {
  blocks: TrackerBlock[];
  progress?: number;
  activeId?: string | null;
  onHover?: (id: string | null) => void;
  /** show the counts + shape legend under the row */
  showLegend?: boolean;
  className?: string;
};

export function ComplianceTracker({
  blocks,
  progress = 1,
  activeId = null,
  onHover,
  showLegend = true,
  className,
}: ComplianceTrackerProps) {
  const p = clamp01(progress);
  const counts = {
    red: blocks.filter((b) => b.signal === "red").length,
    yellow: blocks.filter((b) => b.signal === "yellow").length,
    green: blocks.filter((b) => b.signal === "green").length,
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="flex h-9 w-full items-stretch gap-[3px]">
        {blocks.map((block, i) => {
          const bp = stagger(p, i, blocks.length, 0.7);
          const s = SIGNAL[block.signal];
          // A "not yet evaluated" block is a light rail, never a heavy fill -
          // solid neutral (near black / near white) would read as a signal.
          const fill = block.signal === "neutral" ? "bg-muted-foreground/20" : s.solid;
          const isActive = block.id === activeId;
          const dim = activeId !== null && !isActive;
          return (
            <button
              key={block.id}
              type="button"
              aria-label={`${block.label}, ${s.label || block.signal}`}
              onMouseEnter={onHover ? () => onHover(block.id) : undefined}
              onMouseLeave={onHover ? () => onHover(null) : undefined}
              onFocus={onHover ? () => onHover(block.id) : undefined}
              onBlur={onHover ? () => onHover(null) : undefined}
              style={{
                transform: `scaleY(${0.3 + 0.7 * bp})`,
                opacity: dim ? 0.45 : bp,
                transformOrigin: "bottom",
              }}
              className={cn(
                "group relative flex-1 rounded-[3px] outline-none transition-[opacity,transform] duration-150",
                fill,
                isActive && cn("ring-2 ring-offset-2 ring-offset-background", s.ring),
              )}
            />
          );
        })}
      </div>

      {showLegend ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <Legend signal="red" count={counts.red} word="violation" />
          <Legend signal="yellow" count={counts.yellow} word="attention" />
          <Legend signal="green" count={counts.green} word="passing" />
        </div>
      ) : null}
    </div>
  );
}

function Legend({ signal, count, word }: { signal: Signal; count: number; word: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <SignalMark signal={signal} />
      <span className="font-medium text-foreground">{count}</span>
      <span>{word}</span>
    </span>
  );
}
