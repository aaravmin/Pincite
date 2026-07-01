// A prop-only horizontal bar list (the Tremor Bar List analogue, built custom so
// it is progress-driven and Remotion-safe). Bars grow from `progress`. Signal
// tints stay on-palette; default bars are neutral so red is never spent on
// decoration - pass an explicit signal only where a bar marks a real defect.

import { cn } from "@/lib/utils";
import { SIGNAL, clamp01, stagger, type Signal } from "./types";
import { SignalMark } from "./signal";

export type BarItem = {
  label: string;
  /** 0..1 fraction of the row width */
  value: number;
  /** display value, e.g. "42%" or a count */
  display?: string;
  signal?: Signal;
  note?: string;
};

export function BarList({
  items,
  progress = 1,
  className,
}: {
  items: BarItem[];
  progress?: number;
  className?: string;
}) {
  const p = clamp01(progress);
  return (
    <ul className={cn("space-y-2.5", className)}>
      {items.map((item, i) => {
        const ip = stagger(p, i, items.length, 0.7);
        const signal = item.signal ?? "neutral";
        const s = SIGNAL[signal];
        const fill = signal === "neutral" ? "bg-foreground/80" : s.solid;
        return (
          <li key={item.label}>
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-1.5 text-foreground">
                {signal !== "neutral" ? <SignalMark signal={signal} /> : null}
                {item.label}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {item.display ?? `${Math.round(item.value * 100)}%`}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", fill)}
                style={{ width: `${clamp01(item.value) * ip * 100}%` }}
              />
            </div>
            {item.note ? (
              <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
