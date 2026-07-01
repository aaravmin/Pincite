// Shared visual system - the three-signal design DNA, expressed once so every
// visual (site, dashboard, and the Remotion demo) speaks the same language.
//
// These are PURE types + token maps. No JSX, no clock, no browser APIs, so they
// import safely into a server component, a client component, or a Remotion frame.

/**
 * The three-signal palette. Red is reserved for defect flags ONLY. Yellow is
 * attention/conditional/highlight. Green is applies-and-passes. Neutral carries
 * everything else. This mirrors the app's finding severities.
 */
export type Signal = "red" | "yellow" | "green" | "neutral";

/** The persisted finding severity, mapped 1:1 onto a Signal. */
export type Severity = "violation" | "attention" | "pass";

export function signalFromSeverity(s: Severity | string): Signal {
  if (s === "violation") return "red";
  if (s === "attention") return "yellow";
  if (s === "pass") return "green";
  return "neutral";
}

/**
 * Token class names per signal, drawn only from the app's CSS variables
 * (app/globals.css). Never raw Tailwind palette colors, so light/dark and the
 * WCAG-tuned values stay in one place.
 */
export const SIGNAL: Record<
  Signal,
  {
    /** readable text color on a light/neutral surface */
    text: string;
    /** subtle surface fill */
    bg: string;
    /** full-strength fill (markers, tracker blocks) */
    solid: string;
    /** foreground on the solid fill */
    on: string;
    border: string;
    ring: string;
    /** the always-present text label, so color is never the only signal */
    label: string;
  }
> = {
  red: {
    text: "text-violation",
    bg: "bg-violation-bg",
    solid: "bg-violation",
    on: "text-violation-foreground",
    border: "border-violation",
    ring: "ring-violation",
    label: "Violation",
  },
  yellow: {
    text: "text-attention-foreground",
    bg: "bg-attention-bg",
    solid: "bg-attention",
    on: "text-attention-foreground",
    border: "border-attention",
    ring: "ring-attention",
    label: "Attention",
  },
  green: {
    text: "text-pass",
    bg: "bg-pass-bg",
    solid: "bg-pass",
    on: "text-pass-foreground",
    border: "border-pass",
    ring: "ring-pass",
    label: "Pass",
  },
  neutral: {
    text: "text-muted-foreground",
    bg: "bg-muted",
    solid: "bg-foreground",
    on: "text-background",
    border: "border-border",
    ring: "ring-ring",
    label: "",
  },
};

/** Shape token so color is never the only signal (accessibility discipline). */
export type SignalShape = "solid-dot" | "outline-dot" | "check";

export function shapeForSignal(signal: Signal): SignalShape {
  if (signal === "red") return "solid-dot";
  if (signal === "yellow") return "outline-dot";
  if (signal === "green") return "check";
  return "solid-dot";
}

/** A highlighted character range inside a plain-text section. */
export type VisualSpan = {
  start: number;
  end: number;
  signal: Signal;
  /** when present, this span carries a hoverable/clickable finding flag */
  flagId?: string;
};

/** The three-tier citation, Law then Rule then Guidance. */
export type Citation = {
  /** statute, e.g. "35 U.S.C. 112(b)" (optional, not every finding cites one) */
  law?: string | null;
  /** regulation, e.g. "37 CFR 1.75(c)" */
  cfr?: string | null;
  /** MPEP section number, e.g. "608.01(n)" */
  mpep?: string | null;
  /** plain-language guidance that explains the law and the rule */
  guidance: string;
  /** optional snapshot of real MPEP text for a static peek */
  excerpt?: string | null;
};

/**
 * Clamp helper. Every reveal is driven by a progress value in [0, 1]; this keeps
 * per-item staggering readable.
 */
export function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/**
 * Stagger a child's local progress out of a parent progress. Item `i` of `count`
 * starts at i/count and finishes by (i+1)/count (with a little overlap).
 */
export function stagger(progress: number, i: number, count: number, overlap = 0.4): number {
  const span = 1 / Math.max(1, count);
  const start = i * span * (1 - overlap * (1 / Math.max(1, count)));
  const t = (progress - start) / span;
  return clamp01(t);
}
