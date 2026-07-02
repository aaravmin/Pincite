"use client";

// Interactive "where rejections come from" explorer. Every ground an examiner
// rejects on maps to one of Pincite's checks - the rule check (MPEP and CFR
// validators), the prior patents check (overlap with earlier patents, exact and by
// meaning), or the drawing check (figures and reference numerals). Pick a ground on
// the left, see which check catches it and a preview on the right.

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BookOpenCheck, Layers, PenLine } from "lucide-react";

type Engine = "rule" | "art" | "drawing";

// A rule-check before/after: each part is [text before the mark, the marked span,
// text after]. The was-span is the problem, the now-span is the correction.
type RuleFix = { was: [string, string, string]; now: [string, string, string] };

type Ground = {
  ref: string;
  name: string;
  /** approximate share of office actions raising this ground (grounds overlap) */
  share: number;
  engine: Engine;
  how: string;
  fix?: RuleFix;
};

// Ordered most common first. Shares are approximate and overlap, so they do not
// add up - the point is that a check exists for every one of them. Each rule ground
// carries its own, distinct correction example.
const GROUNDS: Ground[] = [
  {
    ref: "35 USC 103",
    name: "Obviousness",
    share: 0.85,
    engine: "art",
    how: "Your claims are checked one limitation at a time, including where two earlier patents only cover a claim together.",
  },
  {
    ref: "35 USC 112(b)",
    name: "Indefiniteness",
    share: 0.4,
    engine: "rule",
    how: "A term of degree like substantially is caught when the specification gives no way to measure it.",
    // Term of degree: an unmeasurable word narrowed to a definite limit (2173.05(b)).
    fix: {
      was: ["a ", "substantially flat", " lid"],
      now: ["a lid ", "flat to within 0.5 millimeters", ""],
    },
  },
  {
    ref: "35 USC 102",
    name: "Novelty",
    share: 0.3,
    engine: "art",
    how: "Anything already in one earlier patent is shown next to your claim, matched by meaning and not just words.",
  },
  {
    ref: "35 USC 112(a)",
    name: "Written description and enablement",
    share: 0.2,
    engine: "rule",
    how: "Where a claim reaches past what your description supports, the gap is marked.",
    // Written description: narrow an overbroad claim to what the spec supports.
    fix: {
      was: ["formed from ", "any resilient material", ""],
      now: ["formed from ", "molded fiber", ""],
    },
  },
  {
    ref: "37 CFR 1.84",
    name: "Drawings and reference numerals",
    share: 0.2,
    engine: "drawing",
    how: "Every numeral in a figure is matched against the text, so a missing one is caught.",
  },
  {
    ref: "35 USC 101",
    name: "Subject matter eligibility",
    share: 0.15,
    engine: "rule",
    how: "Your claims are tested the way an examiner would test them, step by step.",
    // Eligibility: tie an abstract step to the concrete article that carries it.
    fix: {
      was: ["", "a method of choosing", " a ridge layout"],
      now: ["", "a molded container with", " a ridge layout"],
    },
  },
];

const ENGINES: Record<Engine, { label: string; icon: typeof Layers; blurb: string }> = {
  rule: {
    label: "Rule check",
    icon: BookOpenCheck,
    blurb: "We show the exact rule your draft breaks.",
  },
  art: {
    label: "Prior patents check",
    icon: Layers,
    blurb: "We compare your claims to earlier patents.",
  },
  drawing: {
    label: "Drawing check",
    icon: PenLine,
    blurb: "We match every figure against your text.",
  },
};

function pct(share: number) {
  return Math.round(share * 100);
}

function Mark({ signal, children }: { signal: "red" | "yellow" | "green"; children: React.ReactNode }) {
  const map = {
    red: "bg-violation-bg text-violation decoration-violation",
    yellow: "bg-attention-bg text-attention-foreground decoration-attention",
    green: "bg-pass-bg text-pass decoration-pass",
  } as const;
  return (
    <mark className={`rounded-[3px] px-0.5 underline decoration-2 underline-offset-2 ${map[signal]}`}>
      {children}
    </mark>
  );
}

// A preview keyed to the selected ground. Rule checks show the correction Pincite
// proposes; prior-patent and drawing checks show what Pincite points out (it never
// silently rewrites either of those).
function Preview({ ground }: { ground: Ground }) {
  if (ground.engine === "art") {
    return (
      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="font-mono text-[13px] leading-relaxed">
          {ground.ref === "35 USC 103" ? (
            <>
              {/* one claim covered by two earlier patents together (obviousness) */}
              <div>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">yours </span>
                a <Mark signal="yellow">molded fiber base</Mark> with{" "}
                <Mark signal="yellow">concentric ridges</Mark>
              </div>
              <div className="mt-1.5">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">US 5,743,110 </span>
                <Mark signal="red">the molded fiber base</Mark>
              </div>
              <div className="mt-1.5">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">US 6,983,542 </span>
                <Mark signal="red">the concentric ridges</Mark>
              </div>
            </>
          ) : (
            <>
              {/* same idea, different words (novelty matched by meaning, not text) */}
              <div>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">yours </span>
                <Mark signal="yellow">ridges that isolate the food</Mark>
              </div>
              <div className="mt-1.5">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">US 5,743,110 </span>
                <Mark signal="red">ribs that lift the item off the floor</Mark>
              </div>
            </>
          )}
        </div>
        <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
          {ground.ref === "35 USC 103"
            ? "Neither patent covers your claim alone, but together they may make it obvious if there is a reason to combine them."
            : "No words in common, but the same idea, which a plain text search would miss."}
        </p>
      </div>
    );
  }
  if (ground.engine === "drawing") {
    return (
      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="flex flex-wrap gap-1.5">
          {["108", "203", "216", "224"].map((n) => (
            <span
              key={n}
              className="rounded-md border border-violation bg-violation-bg px-2 py-0.5 font-mono text-sm font-medium text-violation"
            >
              {n}
            </span>
          ))}
        </div>
        <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
          These numerals are on the figure but never appear in the specification.
        </p>
      </div>
    );
  }
  // rule: the ground's own correction
  const fix = ground.fix!;
  return (
    <div className="rounded-lg border bg-muted/30 p-3 font-mono text-[13px] leading-relaxed">
      <div className="flex items-baseline gap-2">
        <span className="w-10 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">was</span>
        <span>
          {fix.was[0]}
          <Mark signal="red">{fix.was[1]}</Mark>
          {fix.was[2]}
        </span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="w-10 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">now</span>
        <span>
          {fix.now[0]}
          <Mark signal="green">{fix.now[1]}</Mark>
          {fix.now[2]}
        </span>
      </div>
    </div>
  );
}

export function RejectionExplorer() {
  const [sel, setSel] = useState(0);
  const active = GROUNDS[sel];
  const engine = ENGINES[active.engine];
  const EngineIcon = engine.icon;
  const previewLabel = active.engine === "rule" ? "How Pincite fixes it" : "What Pincite points out";

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-7">
      <h3 className="text-base font-semibold text-foreground">Where rejections come from</h3>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* left: the grounds, selectable */}
        <ul className="space-y-1.5">
          {GROUNDS.map((g, i) => {
            const isActive = i === sel;
            const gEngine = ENGINES[g.engine];
            const GIcon = gEngine.icon;
            return (
              <li key={g.ref}>
                <button
                  type="button"
                  onClick={() => setSel(i)}
                  aria-pressed={isActive}
                  className={
                    "group w-full rounded-xl border px-3.5 py-3 text-left transition-colors " +
                    (isActive
                      ? "border-border bg-card shadow-xs"
                      : "border-transparent hover:border-border hover:bg-muted/30")
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-sm font-medium text-foreground">{g.ref}</span>
                    <span className="w-12 shrink-0 text-right tabular-nums text-xs text-muted-foreground">
                      {pct(g.share)}%
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span className="truncate text-sm text-muted-foreground">{g.name}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-muted-foreground">
                      <GIcon className="size-3.5" aria-hidden />
                      {gEngine.label}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={
                        "h-full rounded-full transition-all duration-500 ease-out " +
                        (isActive ? "bg-foreground/80" : "bg-muted-foreground/40")
                      }
                      style={{ width: `${pct(g.share)}%` }}
                    />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        {/* right: the check that catches the selected ground, and the preview */}
        <div className="flex flex-col rounded-xl border bg-background p-4 sm:p-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.ref}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex h-full flex-col"
            >
              <span className="inline-flex w-fit items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-semibold text-foreground">
                <EngineIcon className="size-4" aria-hidden />
                {engine.label}
              </span>
              <div className="mt-4 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
                <span className="font-mono text-xl font-medium text-foreground sm:text-2xl">{active.ref}</span>
                <span className="text-sm text-muted-foreground">{active.name}</span>
              </div>
              <p className="mt-3 text-pretty text-sm leading-relaxed text-foreground/90">{active.how}</p>

              <div className="mt-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {previewLabel}
                </p>
                <Preview ground={active} />
              </div>

              <p className="mt-auto pt-5 text-xs text-muted-foreground">{engine.blurb}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        Grounds overlap, so shares do not add up. Source USPTO reporting.
      </p>
    </div>
  );
}
