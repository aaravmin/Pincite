"use client";

// How it works - a numbered vertical timeline of the workflow (draft, check,
// compare, fix, export). The rail draws itself in on scroll and each step staggers
// up, so it reads as one continuous thread. Calm and minimal, few words.

import { motion, type Variants } from "motion/react";
import { BlurFade } from "@/components/ui/blur-fade";

const STEPS = [
  { n: "01", title: "Draft", body: "Write your patent one section at a time." },
  { n: "02", title: "Check", body: "Every rule violation flagged and cited." },
  { n: "03", title: "Compare", body: "Measured against prior patents for novelty and obviousness." },
  { n: "04", title: "Fix", body: "Review each fix, then apply it." },
  { n: "05", title: "Export", body: "Filing ready documents in the right format." },
];

const rail: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.13, delayChildren: 0.05 } },
};
const stepIn: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};
const dotIn: Variants = {
  hidden: { scale: 0, opacity: 0 },
  show: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 320, damping: 20 } },
};
const lineIn: Variants = {
  hidden: { scaleY: 0 },
  show: { scaleY: 1, transition: { duration: 0.5, ease: "easeOut" } },
};

export function SectionWorkflow() {
  return (
    <section className="border-t">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-14 px-6 py-24 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10 lg:py-32">
        <BlurFade inView>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            How it works
          </p>
          <h2 className="mt-3 max-w-md text-balance font-rounded text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Draft to filing in five steps.
          </h2>
          <p className="mt-5 max-w-sm text-pretty text-lg leading-relaxed text-muted-foreground">
            No new information to learn.
            <br />
            Write, and Pincite handles the rest.
          </p>
        </BlurFade>

        <motion.ol
          className="relative"
          variants={rail}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
        >
          {STEPS.map((s, i) => (
            <motion.li key={s.n} variants={stepIn} className="relative flex gap-6 pb-12 last:pb-0">
              {/* rail: dot + connector */}
              <div className="flex flex-col items-center">
                <motion.span
                  variants={dotIn}
                  className="mt-1.5 size-4 shrink-0 rounded-full bg-foreground ring-4 ring-foreground/10"
                  aria-hidden
                />
                {i < STEPS.length - 1 && (
                  <motion.span
                    variants={lineIn}
                    style={{ originY: 0 }}
                    className="mt-2 w-px flex-1 bg-border"
                    aria-hidden
                  />
                )}
              </div>
              {/* content */}
              <div className="pb-2">
                <div className="font-rounded text-2xl font-semibold text-muted-foreground/45">{s.n}</div>
                <h3 className="mt-1 font-rounded text-2xl font-semibold tracking-tight text-foreground">
                  {s.title}
                </h3>
                <p className="mt-1.5 max-w-md text-pretty text-lg leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </div>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}
