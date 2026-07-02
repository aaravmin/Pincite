"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, BookOpen, ChevronDown } from "lucide-react";
import { TextAnimate } from "@/components/ui/text-animate";
import { BlurFade } from "@/components/ui/blur-fade";
import { DotPattern } from "@/components/ui/dot-pattern";
import { SectionEyebrow } from "@/components/marketing/section-eyebrow";
import { LaunchVideo } from "@/components/marketing/launch-video";
import { cn } from "@/lib/utils";
import { AnnotatedEditor } from "@visual/annotated-editor";
import { CitationStack } from "@visual/citation-stack";
import { SignalBadge } from "@visual/signal";
import { useReveal } from "@visual/reveal";
import {
  APPLE_HERO_CLAIMS,
  APPLE_HERO_SPANS,
  APPLE_META,
  CLAIM6_FINDING,
  CLAIM6_FLAG_ID,
} from "@visual/fixtures/apple-example";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Layered, deliberately quiet background. A drawing-sheet dot field that
          fades out toward the page, plus a single sanctioned warm wash behind
          the review card and a mirrored counterweight in the far corner. A
          visitor should feel warmth, not see orange. */}
      <DotPattern
        aria-hidden
        width={22}
        height={22}
        cr={1}
        className="pointer-events-none -z-10 text-foreground/[0.05] [mask-image:radial-gradient(65%_55%_at_60%_0%,black,transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(55%_45%_at_78%_8%,rgba(255,138,42,0.09),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50%_40%_at_12%_95%,rgba(255,168,80,0.05),transparent_70%)]"
      />
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-start gap-12 px-6 py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:py-24">
        {/* left: the stake */}
        <div className="max-w-xl">
          <BlurFade delay={0} inView>
            <SectionEyebrow n="0001">Patent review dashboard</SectionEyebrow>
          </BlurFade>

          <TextAnimate
            as="h1"
            by="word"
            animation="blurInUp"
            duration={0.9}
            once
            className="mt-5 text-balance font-rounded text-4xl font-semibold leading-[1.03] tracking-tight text-foreground sm:text-5xl lg:text-6xl"
          >
            Nine in ten applications get rejected the first time
          </TextAnimate>

          <BlurFade delay={0.5} inView>
            <p className="mt-6 max-w-lg text-pretty text-xl leading-relaxed text-muted-foreground">
              Most of them for preventable rule violations. Pincite catches each one in your draft,
              pins it to the real MPEP and CFR text, and compares your claims against granted patents
              before you file.
            </p>
          </BlurFade>

          <BlurFade delay={0.65} inView>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Start a review
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <LaunchVideo className="rounded-md border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                Watch the demo
              </LaunchVideo>
            </div>
          </BlurFade>

          <BlurFade delay={0.8} inView>
            <div className="mt-9">
              <p className="text-xs font-medium text-muted-foreground">
                We only ever tell you three things
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <SignalBadge signal="red" size="lg">Violation</SignalBadge>
                <SignalBadge signal="yellow" size="lg">Attention</SignalBadge>
                <SignalBadge signal="green" size="lg">Pass</SignalBadge>
              </div>
            </div>
          </BlurFade>
        </div>

        {/* right: one live review surface (real product components) */}
        <BlurFade delay={0.3} inView className="lg:pl-2">
          <HeroReview />
        </BlurFade>
      </div>
    </section>
  );
}

// One seamless surface: the draft at the top, and the review that reads off it
// attached directly below. The flag opens into its exact rule at three levels,
// and the guidance resolves to the real MPEP passage you can pull up in place.
function HeroReview() {
  const { ref, progress } = useReveal({ amount: 0.2, duration: 1200 });
  const f = CLAIM6_FINDING;

  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      className="overflow-hidden rounded-2xl border bg-card shadow-2xl shadow-foreground/[0.08] ring-1 ring-foreground/5"
    >
      {/* the draft, flush at the top of the surface */}
      <AnnotatedEditor
        text={APPLE_HERO_CLAIMS}
        spans={APPLE_HERO_SPANS}
        activeFlagId={CLAIM6_FLAG_ID}
        progress={progress}
        caption={APPLE_META.claimsCaption}
        className="rounded-none border-0 shadow-none"
      />

      {/* the review, attached with no seam */}
      <div className="space-y-5 border-t p-5 sm:p-6">
        {/* the finding */}
        <div>
          <div className="flex items-center gap-2">
            <SignalBadge signal="red">Violation</SignalBadge>
            <span className="text-xs text-muted-foreground">Claims</span>
          </div>
          <p className="mt-2.5 text-[15px] font-semibold leading-snug text-foreground">{f.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.explanation}</p>
        </div>

        {/* the same rule, at three levels */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            The same rule, at three levels
          </p>
          <CitationStack
            dense
            law={f.citation.law}
            cfr={f.citation.cfr}
            mpep={f.citation.mpep}
            guidance="The law and the rule set the requirement. The guidance is the part that tells you exactly how to fix it."
            progress={progress}
            hideSource
            helperLine=""
          />
        </div>

        {/* pull up the exact MPEP text the guidance rests on */}
        <MpepReveal mpep={f.citation.mpep!} passage={f.citation.excerpt!} progress={progress} />
      </div>
    </div>
  );
}

// The proof that nothing is guessed: open the exact MPEP passage the citation
// resolves to, highlighted to the clause that governs. Collapsed by default, so
// the surface stays calm until you ask for the receipt.
function MpepReveal({
  mpep,
  passage,
  progress,
}: {
  mpep: string;
  passage: string;
  progress: number;
}) {
  const [open, setOpen] = useState(false);
  // the governing clause inside the verbatim passage
  const key = "referring back to and further limiting another claim";
  const at = passage.indexOf(key);
  const before = at >= 0 ? passage.slice(0, at) : passage;
  const hit = at >= 0 ? passage.slice(at, at + key.length) : "";
  const after = at >= 0 ? passage.slice(at + key.length) : "";

  return (
    <div
      style={{ opacity: progress > 0.75 ? 1 : 0 }}
      className="rounded-xl border bg-muted/20 transition-opacity duration-500"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <span className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-md border bg-card text-muted-foreground">
            <BookOpen className="size-4" aria-hidden />
          </span>
          <span className="text-sm font-medium text-foreground">Open the exact MPEP text</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="hidden font-mono text-xs text-muted-foreground sm:inline">MPEP {mpep}</span>
          <ChevronDown
            className={cn("size-4 text-muted-foreground transition-transform duration-300", open && "rotate-180")}
            aria-hidden
          />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="mpep"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <div className="overflow-hidden rounded-lg border bg-card">
                <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    MPEP {mpep} . Dependent Claims
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">USPTO corpus</span>
                </div>
                <p className="px-3 py-3 font-mono text-[12.5px] leading-relaxed text-foreground/90">
                  {before}
                  <mark className="rounded-[3px] bg-attention-bg px-0.5 text-attention-foreground underline decoration-2 decoration-attention underline-offset-4">
                    {hit}
                  </mark>
                  {after}
                </p>
              </div>
              <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
                The pinned passage, word for word. Every citation resolves to real text, never a
                paraphrase.
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
