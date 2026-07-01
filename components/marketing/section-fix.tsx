"use client";

// A payoff for the trace: the same real finding (claim 4 pointing at a claim that
// does not exist) resolving. Drag the handle to wipe from the flagged draft to the
// filing ready version. Red marks the violation, green marks the pass - the only
// place the palette earns those colors on this page.

import { BlurFade } from "@/components/ui/blur-fade";
import { CompareSlider } from "@/components/ui/compare-slider";
import { AnnotatedEditor } from "@visual/annotated-editor";
import { SignalBadge } from "@visual/signal";
import type { VisualSpan } from "@visual/types";
import { APPLE_HERO_CLAIMS, APPLE_META } from "@visual/fixtures/apple-example";

// Before: claim 4 refers to claim 6, which does not exist (the real Tier 1
// finding). After: the reference is corrected to an existing earlier claim. Same
// character length, so the two layers line up exactly under the wipe.
const FIXED = APPLE_HERO_CLAIMS.replace("claim 6", "claim 3");

const bs = APPLE_HERO_CLAIMS.indexOf("claim 6");
const BEFORE_SPANS: VisualSpan[] = [{ start: bs, end: bs + "claim 6".length, signal: "red" }];
const as = FIXED.indexOf("claim 3");
const AFTER_SPANS: VisualSpan[] = [{ start: as, end: as + "claim 3".length, signal: "green" }];

export function SectionFix() {
  return (
    <section className="border-t bg-muted/20">
      <div className="mx-auto w-full max-w-6xl px-6 py-24 lg:py-32">
        <BlurFade inView>
          <h2 className="max-w-3xl text-balance font-rounded text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            From flagged to filing ready, one drag away.
          </h2>
          <p className="mt-5 max-w-2xl text-pretty text-xl leading-relaxed text-muted-foreground">
            Every fix is yours to review before it lands. Drag the handle to watch a real finding
            resolve.
          </p>
        </BlurFade>

        <BlurFade inView delay={0.15}>
          <div className="mx-auto mt-12 max-w-3xl rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <SignalBadge signal="red">Flagged</SignalBadge>
              <SignalBadge signal="green">Filing ready</SignalBadge>
            </div>

            <CompareSlider
              ariaLabel="Drag to reveal the fix"
              before={
                <AnnotatedEditor
                  text={APPLE_HERO_CLAIMS}
                  spans={BEFORE_SPANS}
                  progress={1}
                  caption={APPLE_META.claimsCaption}
                />
              }
              after={
                <AnnotatedEditor
                  text={FIXED}
                  spans={AFTER_SPANS}
                  progress={1}
                  caption={APPLE_META.claimsCaption}
                />
              }
            />

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Drag the handle to compare. Claim 4 pointed at claim 6, which does not exist. The fix
              points it at an existing earlier claim.
            </p>
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
