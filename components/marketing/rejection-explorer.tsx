"use client";

// Interactive "where rejections come from" explorer. Every ground an examiner
// rejects on maps to one of Pincite's checks - the rule check (MPEP and CFR
// validators), the prior patents check (pinpoint overlap with earlier patents), or
// the drawing check (figures and reference numerals). Pick a ground on the left,
// see which check catches it and a preview of the fix on the right.

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BookOpenCheck, Layers, PenLine } from "lucide-react";

type Engine = "rule" | "art" | "drawing";

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
    how: "Lined up against earlier patents, one limitation at a time, so what is genuinely new stands out.",
  },
  {
    ref: "35 USC 112(b)",
    name: "Indefiniteness and antecedent basis",
    share: 0.4,
    engine: "rule",
    how: "Vague terms and missing antecedents are caught against MPEP 2173, each tied to its passage.",
  },
  {
    ref: "35 USC 102",
    name: "Novelty",
    share: 0.3,
    engine: "art",
    how: "Overlap with a single earlier patent is shown limitation by limitation, not as a score.",
  },
  {
    ref: "35 USC 112(a)",
    name: "Written description and enablement",
    share: 0.2,
    engine: "rule",
    how: "Where a claim reaches past what the specification supports, the gap is marked before you file.",
  },
  {
    ref: "37 CFR 1.84",
    name: "Drawings and reference numerals",
    share: 0.2,
    engine: "drawing",
    how: "Every numeral in a figure is matched to the specification, so a missing one is caught.",
  },
  {
    ref: "35 USC 101",
    name: "Subject matter eligibility",
    share: 0.15,
    engine: "rule",
    how: "A plain Alice and Mayo walkthrough tied to MPEP 2106, so you can meet eligibility head on.",
  },
];

const ENGINES: Record<Engine, { label: string; icon: typeof Layers; blurb: string }> = {
  rule: {
    label: "Rule check",
    icon: BookOpenCheck,
    blurb: "We read your draft against the rulebook and show the exact rule it breaks.",
  },
  art: {
    label: "Prior patents check",
    icon: Layers,
    blurb: "We compare your claims to earlier patents and mark the exact overlaps.",
  },
  drawing: {
    label: "Drawing check",
    icon: PenLine,
    blurb: "We match every figure and its reference numerals against the specification.",
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

// A small preview of the fix Pincite lands for the selected check. Reuses the same
// real, public example snippets shown elsewhere on the page.
function FixPreview({ engine }: { engine: Engine }) {
  if (engine === "art") {
    return (
      <div className="rounded-lg border bg-muted/30 p-3 font-mono text-[13px] leading-relaxed">
        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">yours</span>
          <span>
            <Mark signal="yellow">a plurality of ridges</Mark> on the base
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="w-14 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">earlier</span>
          <span>
            <Mark signal="red">a plurality of ridges</Mark> on the tray
          </span>
        </div>
      </div>
    );
  }
  if (engine === "drawing") {
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
        <p className="mt-2 font-mono text-xs text-muted-foreground">In the figure, never in the specification.</p>
      </div>
    );
  }
  // rule: a multiple dependent claim, corrected from "and" to "or"
  return (
    <div className="rounded-lg border bg-muted/30 p-3 font-mono text-[13px] leading-relaxed">
      <div className="flex items-center gap-2">
        <span className="w-10 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">was</span>
        <span>
          claims 1 <Mark signal="red">and</Mark> 2
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="w-10 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">now</span>
        <span>
          claims 1 <Mark signal="green">or</Mark> 2
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

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-base font-semibold text-foreground">Where rejections come from</h3>
        <span className="text-sm text-muted-foreground">Every ground has a check</span>
      </div>

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
                      ? "border-foreground/25 bg-muted/50"
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

        {/* right: the check that catches the selected ground, and the fix */}
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
              <div className="mt-4 flex items-baseline gap-3">
                <span className="font-mono text-2xl font-medium text-foreground">{active.ref}</span>
                <span className="text-sm text-muted-foreground">{active.name}</span>
              </div>
              <p className="mt-3 text-pretty text-sm leading-relaxed text-foreground/90">{active.how}</p>

              <div className="mt-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  How Pincite fixes it
                </p>
                <FixPreview engine={active.engine} />
              </div>

              <div className="mt-auto pt-5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>How often it comes up in rejections</span>
                  <span className="tabular-nums">{pct(active.share)}%</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground/80 transition-all duration-500 ease-out"
                    style={{ width: `${pct(active.share)}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{engine.blurb}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        Grounds overlap, so shares do not add up. Sources USPTO filing and pendency reporting and
        published rejection basis data.
      </p>
    </div>
  );
}
