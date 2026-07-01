"use client";

// A KPI/stat card. Big serif number counts up from `progress` (0..1). Optional
// delta carries a signal (with a shape, never color alone). Prop-only, so the
// same card animates on scroll (web), on mount (dashboard), or on frame (video).

import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { SIGNAL, clamp01, type Signal } from "./types";
import { SignalMark } from "./signal";

export type KpiStatProps = {
  label: string;
  /** numeric target; the displayed value counts up as progress -> 1 */
  value?: number;
  /** render a string instead of a counted number (e.g. a stage name) */
  display?: string;
  prefix?: string;
  suffix?: string;
  /** how many decimals when counting a numeric value */
  decimals?: number;
  progress?: number;
  /** small trend chip under the value */
  delta?: string;
  deltaDirection?: "up" | "down" | "flat";
  /** signal tint for the value + a subtle left accent (defaults neutral) */
  signal?: Signal;
  hint?: string;
  className?: string;
};

export function KpiStat({
  label,
  value,
  display,
  prefix = "",
  suffix = "",
  decimals = 0,
  progress = 1,
  delta,
  deltaDirection = "flat",
  signal = "neutral",
  hint,
  className,
}: KpiStatProps) {
  const p = clamp01(progress);
  const s = SIGNAL[signal];
  const counted =
    value !== undefined ? (value * p).toFixed(decimals) : undefined;
  const shown = display ?? (counted !== undefined ? `${prefix}${counted}${suffix}` : "");

  const DeltaIcon =
    deltaDirection === "up" ? ArrowUp : deltaDirection === "down" ? ArrowDown : Minus;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card p-4 text-card-foreground shadow-sm",
        className,
      )}
    >
      {/* thin signal accent, never the only cue (label carries meaning) */}
      {signal !== "neutral" ? (
        <span className={cn("absolute inset-y-0 left-0 w-[3px]", s.solid)} aria-hidden />
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {signal !== "neutral" ? <SignalMark signal={signal} /> : null}
      </div>
      <div
        className={cn(
          "mt-2 font-serif text-3xl font-semibold tabular-nums tracking-tight",
          signal === "red" ? s.text : "text-foreground",
        )}
        style={{ opacity: 0.4 + 0.6 * p }}
      >
        {shown}
      </div>
      {delta || hint ? (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          {delta ? (
            <span className="inline-flex items-center gap-0.5 font-medium text-foreground">
              <DeltaIcon className="size-3" aria-hidden />
              {delta}
            </span>
          ) : null}
          {hint ? <span>{hint}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
