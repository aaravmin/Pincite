"use client";

// How it works - a horizontal thread of the five workflow steps (draft, check,
// compare, fix, export). A thin connector line runs through a node dot on each
// step; hovering or focusing a step makes it active and reveals its example in a
// panel beneath the rail, anchored to the active column by an upward caret. On
// mobile the thread collapses to a vertical accordion, one example open at a time.
// Calm, neutral, few words. Only the example visuals ever carry a signal color.

import { useId, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SectionEyebrow } from "@/components/marketing/section-eyebrow";
import { AnimatedHeading } from "@/components/marketing/animated-heading";
import { BlurFade } from "@/components/ui/blur-fade";
import { WORKFLOW_STEPS, WorkflowVisual } from "@/components/marketing/workflow-showcase";

// One node on the horizontal rail (lg and up). A real button so it is keyboard
// focusable; hover or focus reports itself active. The dot sits centered on the
// connector line; the number, title and body stack beneath it.
function RailStep({
  index,
  active,
  onActivate,
}: {
  index: number;
  active: boolean;
  onActivate: (i: number) => void;
}) {
  const s = WORKFLOW_STEPS[index];
  return (
    <button
      type="button"
      onMouseEnter={() => onActivate(index)}
      onFocus={() => onActivate(index)}
      aria-pressed={active}
      className="group flex flex-col items-center rounded-xl px-2 pt-0 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {/* node dot, centered on the rail */}
      <span
        className={
          "relative z-10 block size-4 rounded-full ring-4 transition-all duration-300 " +
          (active
            ? "scale-110 bg-foreground ring-foreground/15"
            : "bg-muted-foreground/40 ring-background group-hover:bg-muted-foreground/70")
        }
        aria-hidden
      />
      <span
        className={
          "mt-5 font-mono text-sm font-medium transition-colors duration-300 " +
          (active ? "text-foreground/60" : "text-muted-foreground/50")
        }
      >
        {s.n}
      </span>
      <h3
        className={
          "mt-1 font-rounded text-xl font-semibold tracking-tight transition-colors duration-300 " +
          (active ? "text-foreground" : "text-muted-foreground")
        }
      >
        {s.title}
      </h3>
      <p
        className={
          "mt-1.5 max-w-[15rem] text-pretty text-sm leading-relaxed transition-colors duration-300 " +
          (active ? "text-foreground/80" : "text-muted-foreground")
        }
      >
        {s.body}
      </p>
    </button>
  );
}

// One row in the mobile accordion. Full-width button toggles its example open
// beneath it; height animates. One open at a time (parent owns the open index).
function AccordionStep({
  index,
  open,
  onToggle,
  panelId,
}: {
  index: number;
  open: boolean;
  onToggle: (i: number) => void;
  panelId: string;
}) {
  const s = WORKFLOW_STEPS[index];
  return (
    <div className="border-b last:border-b-0">
      <button
        type="button"
        onClick={() => onToggle(index)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-start gap-4 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          className={
            "mt-0.5 font-mono text-sm font-medium " +
            (open ? "text-foreground/60" : "text-muted-foreground/50")
          }
        >
          {s.n}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={
              "block font-rounded text-lg font-semibold tracking-tight " +
              (open ? "text-foreground" : "text-muted-foreground")
            }
          >
            {s.title}
          </span>
          <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">
            {s.body}
          </span>
        </span>
        <span
          aria-hidden
          className={
            "mt-1 shrink-0 text-muted-foreground transition-transform duration-300 " +
            (open ? "rotate-180" : "rotate-0")
          }
        >
          <svg viewBox="0 0 16 16" className="size-4" fill="none">
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="pb-5">
              <WorkflowVisual step={index} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function SectionWorkflow() {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(0);
  const panelBase = useId();

  // 5 columns; the caret sits under the center of the active column. Each column
  // spans 20% of the rail, so its center is at (index + 0.5) * 20%.
  const caretLeft = `${(active + 0.5) * 20}%`;

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

        {/* Desktop: the horizontal thread + a reveal panel anchored beneath it. */}
        <div className="mt-16 hidden lg:block">
          {/* the rail: a connector line behind five evenly spaced nodes */}
          <div className="relative">
            {/* connector line, centered on the node dots (dots are size-4 = 1rem) */}
            <span
              aria-hidden
              className="absolute left-0 right-0 top-2 h-px bg-border"
            />
            <div className="relative grid grid-cols-5">
              {WORKFLOW_STEPS.map((s, i) => (
                <RailStep
                  key={s.n}
                  index={i}
                  active={active === i}
                  onActivate={setActive}
                />
              ))}
            </div>
          </div>

          {/* the reveal panel, anchored under the active column by an upward caret */}
          <div className="relative mt-8">
            <motion.span
              aria-hidden
              className="absolute -top-2 z-10 size-4 -translate-x-1/2 rotate-45 border-l border-t border-border bg-card"
              animate={{ left: caretLeft }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
            <div className="mx-auto flex min-h-[24rem] max-w-2xl flex-col justify-center rounded-2xl border bg-card p-6 shadow-sm">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -7 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  <WorkflowVisual step={active} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Mobile: a tidy vertical accordion, one example open at a time. */}
        <div className="mt-10 lg:hidden">
          {WORKFLOW_STEPS.map((s, i) => (
            <AccordionStep
              key={s.n}
              index={i}
              open={open === i}
              onToggle={(idx) => setOpen((cur) => (cur === idx ? -1 : idx))}
              panelId={`${panelBase}-panel-${i}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
