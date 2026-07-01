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
}: {
  signal: Signal;
  children?: React.ReactNode;
  className?: string;
}) {
  const s = SIGNAL[signal];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        s.bg,
        s.border,
        s.text,
        className,
      )}
    >
      <SignalMark signal={signal} />
      {children ?? s.label}
    </span>
  );
}
