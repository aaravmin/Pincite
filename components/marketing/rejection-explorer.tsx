"use client";

// Interactive "where rejections come from" explorer. Every ground an examiner
// rejects on maps to one of Pincite's two checks - the rule check (MPEP and CFR
// validators) or the prior art check (pinpoint overlap with earlier patents). Pick
// a ground on the left, see which check catches it on the right. Neutrals only:
// these are informational categories, not live signals on a draft, so no red.

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BookOpenCheck, Layers } from "lucide-react";

type Engine = "rule" | "art";

type Ground = {
  ref: string;
  name: string;
  /** approximate share of office actions raising this ground (grounds overlap) */
  share: number;
  engine: Engine;
  how: string;
};

// Ordered most common first. Shares are approximate and overlap, so they do not
// add up - the point is that a check exists for every one of them.
const GROUNDS: Ground[] = [
  {
    ref: "35 USC 103",
    name: "Obviousness",
    share: 0.85,
    engine: "art",
    how: "Your claims are lined up against real prior patents, limitation by limitation, so you can see what is genuinely non obvious before an examiner does.",
  },
  {
    ref: "35 USC 112(b)",
    name: "Indefiniteness and antecedent basis",
    share: 0.4,
    engine: "rule",
    how: "Ambiguous claim terms and missing antecedent basis are flagged against MPEP 2173, each one pinned to the passage it breaks.",
  },
  {
    ref: "35 USC 102",
    name: "Novelty",
    share: 0.3,
    engine: "art",
    how: "Exact limitation overlaps with a single earlier patent are surfaced as pinpoint matches, never hidden behind a black box score.",
  },
  {
    ref: "35 USC 112(a)",
    name: "Written description and enablement",
    share: 0.2,
    engine: "rule",
    how: "Gaps between what a claim recites and what the specification actually supports are flagged while the draft is still open.",
  },
  {
    ref: "Formalities",
    name: "Drawings and claim form",
    share: 0.2,
    engine: "rule",
    how: "Drawing and claim form defects are checked against 37 CFR 1.84 and 1.75, right down to a reference numeral that never appears in the text.",
  },
  {
    ref: "35 USC 101",
    name: "Subject matter eligibility",
    share: 0.15,
    engine: "rule",
    how: "A neutral Alice and Mayo walkthrough pinned to MPEP 2106, so you can address eligibility head on instead of guessing.",
  },
];

const ENGINES: Record<Engine, { label: string; icon: typeof Layers; blurb: string }> = {
  rule: { label: "Rule check", icon: BookOpenCheck, blurb: "MPEP and CFR validators, each finding pinned to real text" },
  art: { label: "Prior art check", icon: Layers, blurb: "Pinpoint overlap against earlier patents, decomposed not scored" },
};

function pct(share: number) {
  return Math.round(share * 100);
}

export function RejectionExplorer() {
  const [sel, setSel] = useState(0);
  const active = GROUNDS[sel];
  const engine = ENGINES[active.engine];
  const EngineIcon = engine.icon;

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-base font-semibold text-foreground">Where rejections come from</h3>
        <span className="text-sm text-muted-foreground">Every ground has a check</span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_1fr]">
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
                      ? "border-foreground/25 bg-muted/50"
                      : "border-transparent hover:border-border hover:bg-muted/30")
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-sm font-medium text-foreground">{g.ref}</span>
                    <span className="tabular-nums text-xs text-muted-foreground">about {pct(g.share)}%</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span className="truncate text-sm text-muted-foreground">{g.name}</span>
                    <span
                      className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-muted-foreground"
                      title={gEngine.label}
                    >
                      <GIcon className="size-3.5" aria-hidden />
                      {gEngine.label}
                    </span>
                  </div>
                  {/* neutral share bar */}
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

        {/* right: the check that catches the selected ground */}
        <div className="flex flex-col rounded-xl border bg-background p-5">
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
              <div className="mt-4 font-mono text-2xl font-medium text-foreground">{active.ref}</div>
              <p className="mt-1 text-sm text-muted-foreground">{active.name}</p>
              <p className="mt-4 text-pretty text-[15px] leading-relaxed text-foreground/90">{active.how}</p>

              <div className="mt-auto pt-5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Share of office actions</span>
                  <span className="tabular-nums">about {pct(active.share)}%</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground/80 transition-all duration-500 ease-out"
                    style={{ width: `${pct(active.share)}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{engine.blurb}.</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        Grounds overlap, so shares do not add up. Sources USPTO filing and pendency reporting and
        published rejection basis data. Figures use about language, not exact counts.
      </p>
    </div>
  );
}
