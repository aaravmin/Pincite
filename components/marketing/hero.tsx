"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { TextAnimate } from "@/components/ui/text-animate";
import { BlurFade } from "@/components/ui/blur-fade";
import { cn } from "@/lib/utils";
import { AnnotatedEditor } from "@visual/annotated-editor";
import { CitationStack } from "@visual/citation-stack";
import { SignalBadge } from "@visual/signal";
import { useReveal } from "@visual/reveal";
import {
  APPLE_MULTI_CLAIMS,
  APPLE_MULTI_SPANS,
  APPLE_META,
  MULTI_DEPENDENT_FINDING,
} from "@visual/fixtures/apple-example";

const FLAG_ID = "multi-dependent";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* calm background wash, no loud effects */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,var(--accent),transparent_70%)] opacity-60"
      />
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:py-24">
        {/* left: the stake */}
        <div className="max-w-xl">
          <BlurFade delay={0} inView>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Patent review dashboard
            </p>
          </BlurFade>

          <TextAnimate
            as="h1"
            by="word"
            animation="blurInUp"
            once
            className="mt-5 text-balance font-rounded text-4xl font-semibold leading-[1.03] tracking-tight text-foreground sm:text-5xl lg:text-6xl"
          >
            Nine in ten applications get rejected the first time
          </TextAnimate>

          <BlurFade delay={0.35} inView>
            <p className="mt-6 max-w-lg text-pretty text-xl leading-relaxed text-muted-foreground">
              Most of them for preventable rule violations. Pincite catches those in your draft and
              pins each one to the real MPEP and CFR text. It also compares your claims against prior
              patents, so you can judge your idea on novelty and obviousness before you file.
            </p>
          </BlurFade>

          <BlurFade delay={0.5} inView>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Start a review
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </BlurFade>

          <BlurFade delay={0.65} inView>
            <div className="mt-9">
              <p className="text-xs font-medium text-muted-foreground">
                We only ever tell you three things
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <SignalBadge signal="red">Violation</SignalBadge>
                <SignalBadge signal="yellow">Attention</SignalBadge>
                <SignalBadge signal="green">Pass</SignalBadge>
              </div>
            </div>
          </BlurFade>
        </div>

        {/* right: the live mini-demo (real product component) */}
        <HeroDemo />
      </div>
    </section>
  );
}

function HeroDemo() {
  const { ref, progress } = useReveal({ amount: 0.15, duration: 1100 });
  // Default the flag open so the value reads instantly; hover keeps control.
  const [active, setActive] = useState<string | null>(FLAG_ID);
  const finding = MULTI_DEPENDENT_FINDING;

  return (
    <div ref={ref as React.Ref<HTMLDivElement>} className="relative">
      <AnnotatedEditor
        text={APPLE_MULTI_CLAIMS}
        spans={APPLE_MULTI_SPANS}
        activeFlagId={active}
        progress={progress}
        caption={APPLE_META.claimsCaption}
        onActivateFlag={(id) => setActive(id ?? FLAG_ID)}
        className="shadow-md"
      />

      {/* the finding peek, connected to the flag above */}
      <motion.div
        initial={false}
        animate={{ opacity: progress > 0.45 ? 1 : 0, y: progress > 0.45 ? 0 : 12 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={cn(
          "relative mx-3 -mt-2 rounded-xl border bg-card p-4 shadow-lg",
          "sm:mx-6",
        )}
      >
        <div className="mb-2 flex items-center gap-2">
          <SignalBadge signal="red">Violation</SignalBadge>
          <span className="text-xs text-muted-foreground">Claims</span>
        </div>
        <p className="text-sm font-medium text-foreground">{finding.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{finding.explanation}</p>

        <div className="mt-3.5 border-t pt-3.5">
          <CitationStack
            dense
            law={finding.citation.law}
            cfr={finding.citation.cfr}
            mpep={finding.citation.mpep}
            guidance={finding.citation.guidance}
            excerpt={finding.citation.excerpt}
            progress={progress}
            hideSource
            helperLine="The same requirement at three levels."
          />
        </div>
      </motion.div>
    </div>
  );
}
