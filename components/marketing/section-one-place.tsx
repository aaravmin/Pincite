"use client";

// One place. The core proof (every violation opens its exact rule) leads, then the
// features each with a real preview: the drawing check (a real figure), prior
// successful patents overlap, and filing-ready export.

import { PenLine, Layers, FileDown, BookOpen } from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";
import { PatentFigure } from "@/components/marketing/patent-figure";
import { MiniPatentPage } from "@/components/marketing/mini-patent-page";
import { AnnotatedEditor } from "@visual/annotated-editor";
import { CitationStack } from "@visual/citation-stack";
import { BarList } from "@visual/bar-list";
import { SignalBadge } from "@visual/signal";
import { useReveal } from "@visual/reveal";
import {
  APPLE_MULTI_CLAIMS,
  APPLE_MULTI_SPANS,
  APPLE_META,
  MULTI_DEPENDENT_FINDING,
} from "@visual/fixtures/apple-example";

const FLAGGED = ["108", "203", "216", "224"];

const YOURS = "a plurality of ridges integrated with an interior surface of the base";
const PRIOR = "a plurality of ridges formed on an inner floor of the tray";
const PHRASE = "a plurality of ridges";
const ys = YOURS.indexOf(PHRASE);
const ps = PRIOR.indexOf(PHRASE);
const YOUR_SPANS = [{ start: ys, end: ys + PHRASE.length, signal: "yellow" as const }];
const PRIOR_SPANS = [{ start: ps, end: ps + PHRASE.length, signal: "red" as const, flagId: "x" }];

const MATCHES = [
  { label: "US 6,983,542 B2", value: 0.88, display: "88% overlap", signal: "red" as const },
  { label: "US 5,743,110 A", value: 0.56, display: "56% overlap", signal: "yellow" as const },
  { label: "US 7,204,388 B2", value: 0.4, display: "40% overlap", signal: "yellow" as const },
];

const DOCS = ["Specification DOCX", "Application data sheet", "Declaration", "Transmittal", "Fee summary", "LaTeX source"];

// The lead: a real violation opening into its Law, Rule, Guidance stack. Reveal is
// driven by scroll so the citation tiers stagger in.
function TraceLead() {
  const { ref, progress } = useReveal({ amount: 0.25, duration: 1100 });
  const f = MULTI_DEPENDENT_FINDING;

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg border bg-card text-foreground">
          <BookOpen className="size-5" aria-hidden />
        </span>
        <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Rule trace
        </span>
      </div>
      <h3 className="mt-4 text-balance font-rounded text-3xl font-semibold tracking-tight text-foreground">
        Every violation opens its exact rule
      </h3>
      <p className="mt-3 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
        The same requirement, at three levels. Nothing is guessed.
      </p>

      <div
        ref={ref as React.Ref<HTMLDivElement>}
        className="mt-6 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2"
      >
        {/* the flag */}
        <div className="flex h-full flex-col justify-center gap-5 rounded-2xl border bg-card p-7 shadow-sm">
          <AnnotatedEditor
            text={APPLE_MULTI_CLAIMS}
            spans={APPLE_MULTI_SPANS}
            activeFlagId="multi-dependent"
            progress={progress}
            caption={APPLE_META.claimsCaption}
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
        <div className="flex h-full flex-col rounded-2xl border bg-background p-7 shadow-sm">
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
  );
}

export function SectionOnePlace() {
  return (
    <section id="one-place" className="scroll-mt-20 overflow-x-clip border-t bg-muted/20">
      <div className="mx-auto w-full max-w-6xl px-6 py-24 lg:py-32">
        <BlurFade inView>
          <h2 className="max-w-3xl text-balance font-rounded text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Every step to filing, in one dashboard
          </h2>
        </BlurFade>

        <BlurFade inView delay={0.05}>
          <div className="mt-12">
            <TraceLead />
          </div>
        </BlurFade>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Drawing check - full width, real figure */}
          <BlurFade inView className="lg:col-span-2">
            <div className="grid grid-cols-1 items-center gap-8 rounded-2xl border bg-card p-8 shadow-sm lg:grid-cols-2">
              <div className="rounded-xl border bg-background p-6">
                <PatentFigure />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-lg border bg-muted/50 text-foreground">
                    <PenLine className="size-5" aria-hidden />
                  </span>
                  <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Drawing check
                  </span>
                </div>
                <h3 className="mt-4 text-balance font-rounded text-3xl font-semibold tracking-tight text-foreground">
                  Right down to the reference numerals
                </h3>
                <p className="mt-3 text-pretty text-lg leading-relaxed text-muted-foreground">
                  It catches reference numerals that appear in a figure but never in the
                  specification.
                </p>
                <div className="mt-5 flex flex-wrap gap-2.5">
                  {FLAGGED.map((n) => (
                    <span
                      key={n}
                      className="rounded-lg border border-violation bg-violation-bg px-3 py-1.5 font-mono text-lg font-medium text-violation"
                    >
                      {n}
                    </span>
                  ))}
                </div>
                <p className="mt-4 font-mono text-sm text-muted-foreground">37 CFR 1.84(p)(5)</p>
              </div>
            </div>
          </BlurFade>

          {/* Prior successful patents */}
          <BlurFade inView delay={0.1}>
            <div className="flex h-full flex-col rounded-2xl border bg-card p-8 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-lg border bg-muted/50 text-foreground">
                  <Layers className="size-5" aria-hidden />
                </span>
                <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Prior successful patents
                </span>
              </div>
              <h3 className="mt-4 text-balance font-rounded text-2xl font-semibold tracking-tight text-foreground">
                See the exact overlaps
              </h3>
              <div className="mt-5 space-y-3">
                <AnnotatedEditor
                  text={YOURS}
                  spans={YOUR_SPANS}
                  progress={1}
                  caption="Your claim"
                  className="mr-10 transition duration-200 hover:-translate-y-1 hover:shadow-md"
                />
                {/* the earlier patent sits offset to the right, so the exact overlap
                    visibly hangs past your claim above it */}
                <div className="relative z-10 translate-x-6 sm:translate-x-12">
                  <AnnotatedEditor
                    text={PRIOR}
                    spans={PRIOR_SPANS}
                    activeFlagId="x"
                    progress={1}
                    caption="US 6,983,542 B2  .  granted patent"
                    className="shadow-md transition duration-200 hover:-translate-y-1 hover:shadow-lg"
                  />
                </div>
              </div>
              <div className="mt-5 border-t pt-5">
                <BarList items={MATCHES} progress={1} />
              </div>
            </div>
          </BlurFade>

          {/* Export */}
          <BlurFade inView delay={0.15}>
            <div className="flex h-full flex-col rounded-2xl border bg-card p-8 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-lg border bg-muted/50 text-foreground">
                  <FileDown className="size-5" aria-hidden />
                </span>
                <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Filing ready export
                </span>
              </div>
              <h3 className="mt-4 text-balance font-rounded text-2xl font-semibold tracking-tight text-foreground">
                The full set, in the order the USPTO expects
              </h3>
              <MiniPatentPage className="mt-5" />
              <div className="mt-4 flex flex-1 flex-wrap content-center gap-2">
                {DOCS.map((d) => (
                  <div key={d} className="flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5">
                    <span className="text-pass" aria-hidden>
                      <svg viewBox="0 0 16 16" className="size-3.5" fill="none">
                        <path d="M3.5 8.5l3 3 6-6.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="text-[13px] text-foreground">{d}</span>
                  </div>
                ))}
              </div>
            </div>
          </BlurFade>
        </div>
      </div>
    </section>
  );
}
