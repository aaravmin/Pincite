"use client";

// The five micro-visuals for the How it works section, one per step. Each is small
// and quiet, neutrals plus the signal tokens only, and reads instantly on its own.
// section-workflow owns the layout and the scroll logic; this owns the step data and
// the visuals, so the sticky panel and the inline mobile copy share one source.

import { AnnotatedEditor } from "@visual/annotated-editor";
import { SignalBadge } from "@visual/signal";
import {
  APPLE_HERO_CLAIMS,
  APPLE_HERO_SPANS,
  APPLE_META,
  CLAIM6_FINDING,
  CLAIM6_FLAG_ID,
} from "@visual/fixtures/apple-example";

export type WorkflowStep = {
  n: string;
  title: string;
  body: string;
};

export const WORKFLOW_STEPS: WorkflowStep[] = [
  { n: "01", title: "Draft", body: "Write your patent one section at a time." },
  { n: "02", title: "Check", body: "Every rule violation caught and cited." },
  { n: "03", title: "Compare", body: "Measured against granted patents for novelty." },
  { n: "04", title: "Fix", body: "Review each suggested fix, then apply it." },
  { n: "05", title: "Export", body: "Filing ready documents in the right format." },
];

// A slice of the public Apple claims short enough to sit comfortably in the panel.
const DRAFT_SLICE = APPLE_HERO_CLAIMS.split("\n").slice(0, 3).join("\n");
const CHECK_SLICE = APPLE_HERO_CLAIMS.split("\n").slice(2).join("\n");
// Re-offset the hero red span onto the shorter check slice.
const CHECK_START = CHECK_SLICE.indexOf("claim 6");
const CHECK_SPANS = [
  { ...APPLE_HERO_SPANS[0], start: CHECK_START, end: CHECK_START + "claim 6".length },
];

const EXPORT_DOCS = [
  "Specification DOCX",
  "Application data sheet",
  "Declaration",
  "Filing package ZIP",
];

// The same mark styling the rejection explorer uses, so the compare and fix rows
// read as one family across the page.
function Mark({
  signal,
  children,
}: {
  signal: "red" | "yellow" | "green";
  children: React.ReactNode;
}) {
  const map = {
    red: "bg-violation-bg text-violation decoration-violation",
    yellow: "bg-attention-bg text-attention-foreground decoration-attention",
    green: "bg-pass-bg text-pass decoration-pass",
  } as const;
  return (
    <mark
      className={`rounded-[3px] px-0.5 underline decoration-2 underline-offset-2 ${map[signal]}`}
    >
      {children}
    </mark>
  );
}

function CheckIcon() {
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

// Each visual is centered content that fills the panel. Rendered both in the sticky
// panel (keyed to the active step) and inline under each step on mobile.
export function WorkflowVisual({ step }: { step: number }) {
  switch (step) {
    case 0:
      // Draft - a clean draft, nothing flagged.
      return (
        <AnnotatedEditor
          text={DRAFT_SLICE}
          spans={[]}
          progress={1}
          caption={APPLE_META.claimsCaption}
        />
      );
    case 1:
      // Check - the same editor with the red violation live, plus the finding.
      return (
        <div className="space-y-3">
          <AnnotatedEditor
            text={CHECK_SLICE}
            spans={CHECK_SPANS}
            activeFlagId={CLAIM6_FLAG_ID}
            progress={1}
            caption={APPLE_META.claimsCaption}
          />
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="mb-2 flex items-center gap-2">
              <SignalBadge signal="red">Violation</SignalBadge>
              <span className="text-sm text-muted-foreground">Claims</span>
            </div>
            <p className="text-sm font-medium leading-snug text-foreground">
              {CLAIM6_FINDING.title}
            </p>
            <p className="mt-1.5 font-mono text-xs text-muted-foreground">
              MPEP {CLAIM6_FINDING.citation.mpep}
            </p>
          </div>
        </div>
      );
    case 2:
      // Compare - yours (yellow) over theirs (red), the same phrase overlapping.
      return (
        <div className="rounded-xl border bg-background p-5 font-mono text-[13px] leading-relaxed">
          <div className="flex items-baseline gap-3">
            <span className="w-14 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
              yours
            </span>
            <span>
              a lid with <Mark signal="yellow">a plurality of openings</Mark>
            </span>
          </div>
          <div className="my-3 border-t border-dashed border-border" />
          <div className="flex items-baseline gap-3">
            <span className="w-14 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
              theirs
            </span>
            <span>
              a cover having <Mark signal="red">a plurality of openings</Mark>
            </span>
          </div>
          <p className="mt-3 font-sans text-xs leading-relaxed text-muted-foreground">
            US 6,983,542 B2, granted
          </p>
        </div>
      );
    case 3:
      // Fix - was (red) over now (green), one accepted correction.
      return (
        <div className="rounded-xl border bg-background p-5 font-mono text-[13px] leading-relaxed">
          <div className="flex items-baseline gap-3">
            <span className="w-10 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
              was
            </span>
            <span>
              wherein <Mark signal="red">the openings</Mark> comprise slots
            </span>
          </div>
          <div className="my-3 border-t border-dashed border-border" />
          <div className="flex items-baseline gap-3">
            <span className="w-10 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
              now
            </span>
            <span>
              wherein <Mark signal="green">a plurality of openings</Mark> comprise slots
            </span>
          </div>
          <p className="mt-3 font-sans text-xs leading-relaxed text-muted-foreground">
            One suggested fix, reviewed and applied
          </p>
        </div>
      );
    case 4:
      // Export - the four filing documents, each ready.
      return (
        <div className="rounded-xl border bg-background p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ready to file
          </p>
          <ul className="space-y-2.5">
            {EXPORT_DOCS.map((d) => (
              <li
                key={d}
                className="flex items-center gap-2.5 rounded-lg border bg-card px-3.5 py-2.5"
              >
                <CheckIcon />
                <span className="text-sm text-foreground">{d}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    default:
      return null;
  }
}
