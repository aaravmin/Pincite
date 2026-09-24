/**
 * The demo mode notice (shared/demo/mode.ts), so nobody mistakes the in-memory case study
 * for a live account. The root layout renders it as the first child of <body> only in demo
 * mode and marks <html data-demo>, which turns on the rules at the end of app/globals.css
 * that shift every full-height screen and top-anchored sticky element down by its height.
 *
 * Sticky through an inline `top: 0` rather than the `top-0` class, because those rules
 * re-anchor every `.sticky.top-0` element below this banner. Its height (h-9, 2.25rem) is the
 * --demo-banner-h those rules reserve; the notice wraps to at most two lines of text-xs
 * inside it (2 x 1rem), and the full text sits in the title for anything narrower. Attention
 * tokens with the outline dot and a text label, per the color system. The copy avoids every
 * character the output sanitizer strips.
 */
const DEMO_NOTICE =
  "No database or API keys are configured, so this is the public Apple container case study held in memory and reset on restart. Sign in, similar patent search, auto fix, the §101 walkthrough, and drawing checks return precomputed results. Add the keys from the example env file (.env.example) to run them live.";

export function DemoBanner() {
  return (
    <div
      role="status"
      data-testid="demo-banner"
      style={{ top: 0 }}
      className="sticky z-50 flex h-9 shrink-0 items-center gap-2 border-b border-attention bg-attention-bg px-4 text-xs text-attention-foreground sm:px-6"
    >
      <span
        className="size-2 shrink-0 rounded-full border border-attention"
        aria-hidden
      />
      <span className="shrink-0 font-medium">Demo mode</span>
      <span className="line-clamp-2 min-w-0 leading-4" title={DEMO_NOTICE}>
        {DEMO_NOTICE}
      </span>
    </div>
  );
}
