// Plain section label. A quiet uppercase eyebrow above each major heading. The
// `n` prop is accepted but unused so existing call sites need no change; no
// numeral is rendered. Neutral only, never a signal color.
export function SectionEyebrow({ children }: { n?: string; children: string }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}
