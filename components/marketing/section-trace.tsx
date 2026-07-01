"use client";

// The differentiator. One flag opens into the Law, Rule, Guidance stack, reusing
// the real CitationStack the app renders in its evidence view. Reveal is driven
// by scroll; the same component drives the demo video from the frame.

import { AnnotatedEditor } from "@visual/annotated-editor";
import { CitationStack } from "@visual/citation-stack";
import { SignalBadge } from "@visual/signal";
import { useReveal } from "@visual/reveal";
import type { VisualSpan } from "@visual/types";
import { CLAIM6_FINDING } from "@visual/fixtures/apple-example";

const CLAIM_4 =
  "4. The container of claim 6, wherein the plurality of openings comprise a plurality of slots.";
const start = CLAIM_4.indexOf("claim 6");
const CLAIM_4_SPANS: VisualSpan[] = [
  { start, end: start + "claim 6".length, signal: "red", flagId: "claim-6" },
];

export function SectionTrace() {
  const { ref, progress } = useReveal({ amount: 0.3, duration: 1100 });
  const f = CLAIM6_FINDING;

  return (
    <section id="trace" className="scroll-mt-20 border-t">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 lg:py-28">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          The trace
        </p>
        <h2 className="mt-3 max-w-2xl font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
          Every flag opens the exact rule.
        </h2>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Nothing is guessed. A flag is a claim about a rule, so Pincite shows you that rule at
          three levels, the statute, the regulation, and the guidance that explains both.
        </p>

        <div
          ref={ref as React.Ref<HTMLDivElement>}
          className="mt-12 grid grid-cols-1 items-start gap-6 lg:grid-cols-2"
        >
          {/* the flag */}
          <div className="space-y-4">
            <AnnotatedEditor
              text={CLAIM_4}
              spans={CLAIM_4_SPANS}
              activeFlagId="claim-6"
              progress={progress}
              caption="US 2012 0024859 A1  .  Claim 4"
            />
            <div className="rounded-xl border bg-card p-4">
              <div className="mb-2 flex items-center gap-2">
                <SignalBadge signal="red">Violation</SignalBadge>
                <span className="text-xs text-muted-foreground">Claims</span>
              </div>
              <p className="text-sm font-medium text-foreground">{f.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.explanation}</p>
            </div>
          </div>

          {/* the stack */}
          <div className="rounded-xl border bg-muted/20 p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              The rule, at three levels
            </p>
            <CitationStack
              law={f.citation.law}
              cfr={f.citation.cfr}
              mpep={f.citation.mpep}
              guidance={f.citation.guidance}
              excerpt={f.citation.excerpt}
              progress={progress}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
