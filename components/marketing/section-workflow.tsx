"use client";

// How it works - a numbered timeline of the workflow (draft, check, compare, fix,
// export) with a sticky visual panel on the left that crossfades to whichever step
// is centered in the viewport. Each step block watches itself into view and claims
// the panel, so scrolling the steps steps the visual. On mobile the panel is gone
// and each step carries its own visual inline. Calm, neutral, few words.

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView } from "motion/react";
import { SectionEyebrow } from "@/components/marketing/section-eyebrow";
import { AnimatedHeading } from "@/components/marketing/animated-heading";
import { BlurFade } from "@/components/ui/blur-fade";
import { WORKFLOW_STEPS, WorkflowVisual } from "@/components/marketing/workflow-showcase";

// One step in the right-hand timeline. It watches a band around the middle of the
// screen; when it crosses that band it reports itself active so the sticky panel
// swaps to its visual. The active step reads emphasized, the rest calm.
function Step({
  index,
  active,
  onActive,
  isLast,
}: {
  index: number;
  active: boolean;
  onActive: (i: number) => void;
  isLast: boolean;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const inView = useInView(ref, { margin: "-45% 0px -45% 0px" });
  const s = WORKFLOW_STEPS[index];

  // When this step crosses the middle band it claims the sticky panel. The parent
  // owns the active index; we only report on the rising edge.
  useEffect(() => {
    if (inView) onActive(index);
  }, [inView, index, onActive]);

  return (
    <motion.li
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative flex gap-6 pb-14 last:pb-0"
    >
      {/* rail: dot + connector */}
      <div className="flex flex-col items-center">
        <span className="mt-1.5" aria-hidden>
          <span
            className={
              "block size-4 rounded-full ring-4 transition-all duration-300 " +
              (active
                ? "scale-110 bg-foreground ring-foreground/15"
                : "bg-muted-foreground/40 ring-transparent")
            }
          />
        </span>
        {!isLast && <span className="mt-2 w-px flex-1 bg-border" aria-hidden />}
      </div>

      {/* content */}
      <div className="min-w-0 flex-1">
        <div
          className={
            "font-rounded text-xl font-semibold transition-colors duration-300 " +
            (active ? "text-foreground/60" : "text-muted-foreground/40")
          }
        >
          {s.n}
        </div>
        <h3
          className={
            "mt-1 font-rounded text-2xl font-semibold tracking-tight transition-colors duration-300 " +
            (active ? "text-foreground" : "text-muted-foreground")
          }
        >
          {s.title}
        </h3>
        <p
          className={
            "mt-1.5 max-w-md text-pretty text-lg leading-relaxed transition-colors duration-300 " +
            (active ? "text-foreground/80" : "text-muted-foreground")
          }
        >
          {s.body}
        </p>

        {/* mobile only: the visual inline under its step */}
        <div className="mt-5 lg:hidden">
          <WorkflowVisual step={index} />
        </div>
      </div>
    </motion.li>
  );
}

export function SectionWorkflow() {
  const [active, setActive] = useState(0);
  const step = WORKFLOW_STEPS[active];

  return (
    <section className="bg-background">
      <div className="mx-auto w-full max-w-6xl px-6 py-24 lg:py-32">
        <BlurFade inView>
          <SectionEyebrow n="0003">How it works</SectionEyebrow>
        </BlurFade>
        <AnimatedHeading className="mt-3 max-w-2xl text-balance font-rounded text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Draft to filing in five steps
        </AnimatedHeading>
        <BlurFade inView delay={0.1} className="mt-5">
          <p className="max-w-sm text-pretty text-lg leading-relaxed text-muted-foreground">
            Write, and Pincite handles the rest.
          </p>
        </BlurFade>

        <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.05fr]">
          {/* left: the sticky visual panel (lg only). Crossfades to the active step. */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <div className="flex min-h-[26rem] flex-col justify-center rounded-2xl border bg-card p-6 shadow-sm">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    <WorkflowVisual step={active} />
                  </motion.div>
                </AnimatePresence>
              </div>
              <p className="mt-3 text-right font-mono text-xs text-muted-foreground">
                {step.n} {step.title}
              </p>
            </div>
          </div>

          {/* right: the five steps */}
          <ol className="relative">
            {WORKFLOW_STEPS.map((s, i) => (
              <Step
                key={s.n}
                index={i}
                active={active === i}
                onActive={setActive}
                isLast={i === WORKFLOW_STEPS.length - 1}
              />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
