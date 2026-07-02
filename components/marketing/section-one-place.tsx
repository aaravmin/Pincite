"use client";

// Features, as a compact bento grid. A wide inline-review tile plus a narrow
// prior-art tile on top; three equal tiles below (drawing check, filing export,
// versions and audit). Every tile is a real Pincite feature with a small preview.

import { PenLine, Layers, FileDown, BookOpen, History } from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";
import { AnimatedHeading } from "@/components/marketing/animated-heading";
import { SectionEyebrow } from "@/components/marketing/section-eyebrow";
import { PatentFigure } from "@/components/marketing/patent-figure";
import { AnnotatedEditor } from "@visual/annotated-editor";
import { SignalBadge } from "@visual/signal";
import {
  APPLE_HERO_CLAIMS,
  APPLE_HERO_SPANS,
  APPLE_META,
  CLAIM6_FLAG_ID,
  CLAIM6_FINDING,
} from "@visual/fixtures/apple-example";

const FLAGGED = ["108", "203", "216", "224"];

const DOCS = [
  "Specification DOCX",
  "Application data sheet",
  "Declaration",
  "Transmittal",
  "Fee summary",
  "LaTeX source",
];

const VERSIONS = [
  { save: "Save 3", rest: "after fixing claim 4", latest: true },
  { save: "Save 2", rest: "added the abstract", latest: false },
  { save: "Save 1", rest: "first draft", latest: false },
];

// A small check glyph, the same idiom used across the marketing surface.
function Check() {
  return (
    <span className="text-pass" aria-hidden>
      <svg viewBox="0 0 16 16" className="size-3.5" fill="none">
        <path
          d="M3.5 8.5l3 3 6-6.5"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

// A tile header: icon box + uppercase label.
function TileHead({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-lg border bg-muted/50 text-foreground">
        {icon}
      </span>
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

// A compact rule pin row: tier label + its mono reference. The same requirement
// at three levels, echoing the hero stack without repeating it in full.
function RulePin({ tier, refText }: { tier: string; refText: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {tier}
      </span>
      <span className="font-mono text-xs text-foreground">{refText}</span>
    </div>
  );
}

// A small overlap phrase mark. yellow = your claim, red = the matching prior art.
function Mark({ signal, children }: { signal: "yellow" | "red"; children: React.ReactNode }) {
  const map = {
    yellow: "bg-attention-bg text-attention-foreground decoration-attention",
    red: "bg-violation-bg text-violation decoration-violation",
  } as const;
  return (
    <mark className={`rounded-[3px] px-0.5 underline decoration-2 underline-offset-2 ${map[signal]}`}>
      {children}
    </mark>
  );
}

export function SectionOnePlace() {
  return (
    <section id="one-place" className="scroll-mt-20 overflow-x-clip bg-muted/20">
      <div className="mx-auto w-full max-w-6xl px-6 py-24 lg:py-32">
        <BlurFade inView>
          <SectionEyebrow n="0004">Features</SectionEyebrow>
        </BlurFade>
        <AnimatedHeading className="mt-3 max-w-3xl text-balance font-rounded text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Every step to filing, in one dashboard
        </AnimatedHeading>

        <div className="mt-12 grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-6">
          {/* 1. Inline review - WIDE */}
          <BlurFade inView className="sm:col-span-2 lg:col-span-4">
            <div className="flex h-full flex-col rounded-2xl border bg-card p-6">
              <TileHead icon={<BookOpen className="size-5" aria-hidden />} label="Inline review" />
              <h3 className="mt-4 text-balance font-rounded text-2xl font-semibold tracking-tight text-foreground">
                Flagged right on the claim
              </h3>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                Every rule violation is caught on the claim text and pinned to the exact rule behind
                it.
              </p>

              <div className="mt-5 grid flex-1 grid-cols-1 items-stretch gap-4 lg:grid-cols-5">
                <div className="lg:col-span-3">
                  <AnnotatedEditor
                    text={APPLE_HERO_CLAIMS}
                    spans={APPLE_HERO_SPANS}
                    activeFlagId={CLAIM6_FLAG_ID}
                    progress={1}
                    caption={APPLE_META.claimsCaption}
                  />
                </div>
                <div className="flex h-full flex-col gap-3 lg:col-span-2">
                  <div className="flex items-center gap-2">
                    <SignalBadge signal="red">Violation</SignalBadge>
                    <span className="text-sm text-muted-foreground">Claims</span>
                    <span className="ml-auto rounded-md border border-violation bg-violation-bg px-2 py-0.5 font-mono text-xs font-medium text-violation">
                      1 to fix
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col rounded-xl border bg-background p-4">
                    <p className="text-sm font-medium leading-snug text-foreground">
                      {CLAIM6_FINDING.title}
                    </p>
                    <div className="mt-auto space-y-2 border-t pt-4">
                      <RulePin tier="Law" refText="35 U.S.C. 112(d)" />
                      <RulePin tier="Rule" refText="37 CFR 1.75(c)" />
                      <RulePin tier="Guidance" refText="MPEP 608.01(n)" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </BlurFade>

          {/* 2. Prior art overlap - NARROW */}
          <BlurFade inView delay={0.05} className="sm:col-span-2 lg:col-span-2">
            <div className="flex h-full flex-col rounded-2xl border bg-card p-6">
              <TileHead icon={<Layers className="size-5" aria-hidden />} label="Prior art overlap" />
              <h3 className="mt-4 text-balance font-rounded text-xl font-semibold tracking-tight text-foreground">
                Matched by meaning, not just words
              </h3>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                Overlaps are found by the idea underneath your wording, even when two earlier patents
                only cover a claim together.
              </p>

              <div className="mt-5 space-y-4 rounded-xl border bg-background p-4 font-mono text-xs leading-relaxed">
                {/* same idea, different words */}
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Same idea, different words
                  </div>
                  <div className="mt-1.5">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Yours </span>
                    <Mark signal="yellow">ridges that isolate the food</Mark>
                  </div>
                  <div className="mt-1">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">US 5,743,110 </span>
                    <Mark signal="red">ribs that lift the item off the floor</Mark>
                  </div>
                </div>

                <div className="border-t border-dashed" />

                {/* split across two patents (obviousness) */}
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Split across two patents
                  </div>
                  <div className="mt-1.5 text-foreground">
                    a <Mark signal="yellow">molded fiber base</Mark> with{" "}
                    <Mark signal="yellow">concentric ridges</Mark>
                  </div>
                  <div className="mt-1">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">US 5,743,110 </span>
                    <Mark signal="red">the molded fiber base</Mark>
                  </div>
                  <div className="mt-1">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">US 6,983,542 </span>
                    <Mark signal="red">the concentric ridges</Mark>
                  </div>
                  <p className="mt-2 font-sans text-[11px] leading-relaxed text-muted-foreground">
                    With a reason to combine them, the claim may be obvious under 35 U.S.C. 103
                  </p>
                </div>
              </div>

              <p className="mt-auto pt-4 text-xs leading-relaxed text-muted-foreground">
                Every overlap is itemized so you can weigh it yourself.
              </p>
            </div>
          </BlurFade>

          {/* 3. Drawing check */}
          <BlurFade inView delay={0.1} className="lg:col-span-2">
            <div className="flex h-full flex-col rounded-2xl border bg-card p-6">
              <TileHead icon={<PenLine className="size-5" aria-hidden />} label="Drawing check" />
              <h3 className="mt-4 text-balance font-rounded text-xl font-semibold tracking-tight text-foreground">
                Numerals matched to the text
              </h3>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                A numeral on a figure that never appears in the text is caught before an examiner
                sees it.
              </p>

              <div className="mt-5 overflow-hidden rounded-xl border bg-background p-3">
                <PatentFigure className="mx-auto w-full max-w-[280px] sm:w-auto sm:max-h-28 sm:max-w-none" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {FLAGGED.map((n) => (
                  <span
                    key={n}
                    className="rounded-md border border-violation bg-violation-bg px-2 py-0.5 font-mono text-sm font-medium text-violation"
                  >
                    {n}
                  </span>
                ))}
              </div>
              <p className="mt-auto pt-3 font-mono text-xs text-muted-foreground">
                37 CFR 1.84(p)(5)
              </p>
            </div>
          </BlurFade>

          {/* 4. Filing ready export */}
          <BlurFade inView delay={0.15} className="lg:col-span-2">
            <div className="flex h-full flex-col rounded-2xl border bg-card p-6">
              <TileHead icon={<FileDown className="size-5" aria-hidden />} label="Filing ready export" />
              <h3 className="mt-4 text-balance font-rounded text-xl font-semibold tracking-tight text-foreground">
                The full set in USPTO order
              </h3>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                Every document the office needs, in the format and order the rules require.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2">
                {DOCS.map((d) => (
                  <div
                    key={d}
                    className="flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-2"
                  >
                    <Check />
                    <span className="text-xs leading-tight text-foreground">{d}</span>
                  </div>
                ))}
              </div>
              <p className="mt-auto pt-4 font-mono text-xs text-muted-foreground">
                37 CFR 1.77 order
              </p>
            </div>
          </BlurFade>

          {/* 5. Versions and audit */}
          <BlurFade inView delay={0.2} className="lg:col-span-2">
            <div className="flex h-full flex-col rounded-2xl border bg-card p-6">
              <TileHead icon={<History className="size-5" aria-hidden />} label="Versions and audit" />
              <h3 className="mt-4 text-balance font-rounded text-xl font-semibold tracking-tight text-foreground">
                Versioned and audited
              </h3>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                Every save is logged with an audit trail.
              </p>

              <div className="mt-5 rounded-xl border bg-background p-4">
                <ol className="space-y-3">
                  {VERSIONS.map((v) => (
                    <li key={v.save} className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className={`size-2 shrink-0 rounded-full ${
                          v.latest ? "bg-foreground" : "bg-muted-foreground/40"
                        }`}
                      />
                      <span className="text-sm leading-snug">
                        <span className="font-semibold text-foreground">{v.save}</span>{" "}
                        <span className="text-muted-foreground">{v.rest}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              <p className="mt-auto pt-4 text-xs text-muted-foreground">
                Restore or branch from any save
              </p>
            </div>
          </BlurFade>
        </div>
      </div>
    </section>
  );
}
