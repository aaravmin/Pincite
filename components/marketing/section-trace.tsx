"use client";

// The differentiator. One flag opens into the Law, Rule, Guidance stack, reusing
// the real CitationStack the app renders. Two equal-height cards, aligned.

import { AnnotatedEditor } from "@visual/annotated-editor";
import { CitationStack } from "@visual/citation-stack";
import { SignalBadge } from "@visual/signal";
import { useReveal } from "@visual/reveal";
import type { VisualSpan } from "@visual/types";
import { CLAIM6_FINDING } from "@visual/fixtures/apple-example";

const CLAIMS =
  "2. The container of claim 1, wherein the base and the lid are formed as one piece.\n" +
  "3. The container of claim 1, wherein the ridges are arranged concentrically.\n" +
  "4. The container of claim 6, wherein the openings comprise a plurality of slots.";
const start = CLAIMS.indexOf("claim 6");
const SPANS: VisualSpan[] = [{ start, end: start + "claim 6".length, signal: "red", flagId: "claim-6" }];

export function SectionTrace() {
  const { ref, progress } = useReveal({ amount: 0.3, duration: 1100 });
  const f = CLAIM6_FINDING;

  return (
    <section id="trace" className="scroll-mt-20 border-t">
      <div className="mx-auto w-full max-w-6xl px-6 py-24 lg:py-32">
        <h2 className="max-w-3xl text-balance font-rounded text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Every violation opens its exact rule.
        </h2>
        <p className="mt-5 max-w-2xl text-pretty text-xl leading-relaxed text-muted-foreground">
          The same requirement, at three levels. Nothing is guessed.
        </p>

        <div
          ref={ref as React.Ref<HTMLDivElement>}
          className="mt-14 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2"
        >
          {/* the flag */}
          <div className="flex h-full flex-col justify-center gap-5 rounded-2xl border bg-card p-7 shadow-sm">
            <AnnotatedEditor
              text={CLAIMS}
              spans={SPANS}
              activeFlagId="claim-6"
              progress={progress}
              caption="US 2012 0024859 A1  .  Claims"
            />
            <div className="rounded-xl border bg-muted/20 p-5">
              <div className="mb-2.5 flex items-center gap-2">
                <SignalBadge signal="red">Violation</SignalBadge>
                <span className="text-sm text-muted-foreground">Claims</span>
              </div>
              <p className="text-lg font-medium text-foreground">{f.title}</p>
            </div>
          </div>

          {/* the rule, at three levels */}
          <div className="flex h-full flex-col rounded-2xl border bg-muted/20 p-7 shadow-sm">
            <p className="mb-5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              The rule, at three levels
            </p>
            <div className="flex flex-1 flex-col justify-center">
              <CitationStack
                law={f.citation.law}
                cfr={f.citation.cfr}
                mpep={f.citation.mpep}
                guidance={f.citation.guidance}
                excerpt={f.citation.excerpt}
                progress={progress}
                hideSource
                helperLine=""
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
