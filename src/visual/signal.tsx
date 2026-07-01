import { cn } from "@/lib/utils";
import { SIGNAL, shapeForSignal, type Signal } from "./types";

/**
 * The shape marker that always accompanies a signal color, so color is never the
 * only cue (accessibility). Solid dot = violation, outline dot = conditional /
 * attention, check = pass. Pure, prop-only.
 */
export function SignalMark({
  signal,
  className,
}: {
  signal: Signal;
  className?: string;
}) {
  const shape = shapeForSignal(signal);
  const s = SIGNAL[signal];

  // Neutral (to do / not evaluated) is a quiet hollow dot, never a heavy fill.
  if (signal === "neutral") {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-block size-2.5 shrink-0 rounded-full border border-muted-foreground/45 bg-transparent",
          className,
        )}
      />
    );
  }

  if (shape === "check") {
    return (
      <svg
        viewBox="0 0 16 16"
        className={cn("size-3.5 shrink-0", s.text, className)}
        fill="none"
        aria-hidden
      >
        <path
          d="M3.5 8.5l3 3 6-6.5"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (shape === "outline-dot") {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-block size-2.5 shrink-0 rounded-full border-2 border-attention bg-transparent",
          className,
        )}
      />
    );
  }
  // solid-dot (violation / default)
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2.5 shrink-0 rounded-full", s.solid, className)}
    />
  );
}

/**
 * A compact labeled signal chip: shape + word. Used in legends and finding
 * headers so the palette always reads without relying on color alone.
 */
export function SignalBadge({
  signal,
  children,
  className,
  size = "sm",
}: {
  signal: Signal;
  children?: React.ReactNode;
  className?: string;
  /** "lg" scales the pill and its mark up for prominent placements (e.g. the hero) */
  size?: "sm" | "lg";
}) {
  const s = SIGNAL[signal];
  const sizing =
    size === "lg" ? "gap-2 px-3.5 py-1.5 text-sm" : "gap-1.5 px-2 py-0.5 text-xs";
  const markSize = size === "lg" ? (signal === "green" ? "size-4" : "size-3") : undefined;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        sizing,
        s.bg,
        s.border,
        s.text,
        className,
      )}
    >
      <SignalMark signal={signal} className={markSize} />
      {children ?? s.label}
    </span>
  );
}
