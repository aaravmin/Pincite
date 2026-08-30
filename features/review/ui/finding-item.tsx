"use client";

/**
 * One finding: the headline row (severity marker + label + the actionable/informational
 * split), and, when expanded, the reasoning, the exact text that triggered it, its pinned
 * rule, and the three things the user can do about it - go to the issue in the draft,
 * re-check it after a hand edit, or ask for a guided fix.
 *
 * Color discipline: red is a violation, outlined yellow is attention, and each one also
 * carries a word and a shape, so color is never the only signal.
 */
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  applyFix,
  proposeFix,
  recheckFinding,
} from "@/features/review/actions";
import type { FindingRow } from "@/features/review/domain/finding";
import {
  FixProposal,
  type ProposedFix,
} from "@/features/review/ui/fix-proposal";

/** How much surrounding text to show either side of the flagged span. */
const CONTEXT_CHARS = 45;

export function FindingItem({
  f,
  projectId,
  sections,
  selected,
  onSelect,
  onOpenRule,
}: {
  f: FindingRow;
  projectId: string;
  sections: Record<string, string>;
  selected: boolean;
  onSelect: () => void;
  onOpenRule: (n: string) => void;
}) {
  const router = useRouter();
  const [checking, startCheck] = useTransition();
  const [verdict, setVerdict] = useState<"fixed" | "present" | null>(null);
  const [proposing, startPropose] = useTransition();
  const [applying, startApply] = useTransition();
  const [proposal, setProposal] = useState<ProposedFix | null>(null);
  const [fixErr, setFixErr] = useState<string | null>(null);

  function recheck() {
    setVerdict(null);
    startCheck(async () => {
      const r = await recheckFinding(projectId, f.section_key, f.title);
      if ("error" in r) return;
      setVerdict(r.fixed ? "fixed" : "present");
      // When resolved, refresh so it drops out of the list and any new issues appear.
      if (r.fixed) router.refresh();
    });
  }

  // Auto-fix: ask the model for the smallest edit, then show it as a before/after diff to
  // accept or reject. Nothing changes until the user accepts.
  function autoFix() {
    setFixErr(null);
    setProposal(null);
    setVerdict(null);
    startPropose(async () => {
      const r = await proposeFix({
        projectId,
        sectionKey: f.section_key,
        spanStart: f.span_start,
        spanEnd: f.span_end,
        title: f.title,
        explanation: f.explanation,
        cfrRef: f.cfr_ref,
      });
      if ("error" in r) return setFixErr(r.error);
      setProposal({ before: r.before, after: r.after, note: r.note });
    });
  }
  function acceptFix() {
    if (!proposal) return;
    setFixErr(null);
    startApply(async () => {
      const r = await applyFix({
        projectId,
        sectionKey: f.section_key,
        before: proposal.before,
        after: proposal.after,
        spanStart: f.span_start,
      });
      if ("error" in r) return setFixErr(r.error);
      setProposal(null);
      router.refresh(); // the finding drops out of the list if resolved
    });
  }

  const sec = sections[f.section_key] ?? "";
  const hasSpan = f.span_end > f.span_start && sec.length > 0;
  const ctxBefore = hasSpan
    ? sec.slice(Math.max(0, f.span_start - CONTEXT_CHARS), f.span_start)
    : "";
  const ctxTerm = hasSpan ? sec.slice(f.span_start, f.span_end) : "";
  const ctxAfter = hasSpan
    ? sec.slice(f.span_end, Math.min(sec.length, f.span_end + CONTEXT_CHARS))
    : "";
  const sevColor =
    f.severity === "violation" ? "text-violation" : "text-attention-foreground";
  const issueHref = `/projects/${projectId}?section=${encodeURIComponent(
    f.section_key,
  )}&from=${f.span_start}&to=${f.span_end}`;

  return (
    <li
      data-severity={f.severity}
      className="overflow-hidden rounded-md border border-border"
    >
      <button
        type="button"
        onClick={onSelect}
        aria-expanded={selected}
        className={
          "flex w-full items-center gap-2 px-3 py-2 text-left " +
          (selected ? "bg-accent/50" : "hover:bg-accent/40")
        }
      >
        {f.severity === "violation" ? (
          <span
            className="size-2 shrink-0 rounded-full bg-violation"
            aria-hidden
          />
        ) : (
          <span
            className="size-2 shrink-0 rounded-full border border-attention"
            aria-hidden
          />
        )}
        <span className={"shrink-0 text-xs font-medium " + sevColor}>
          {f.severity === "violation" ? "Violation" : "Attention"}
        </span>
        <span className="shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          {f.actionable ? "Fixable" : "Informational"}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {f.title}
        </span>
        <ChevronDown
          className={
            "size-4 shrink-0 text-muted-foreground transition-transform " +
            (selected ? "rotate-180" : "")
          }
          aria-hidden
        />
      </button>

      {selected && (
        <div className="space-y-2 border-t border-border px-3 py-2.5">
          <p className="text-sm text-muted-foreground">{f.explanation}</p>
          {hasSpan && (
            <div className="rounded bg-muted px-2 py-1.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Triggered by: </span>
              <span className="font-mono">
                {ctxBefore && "…"}
                {ctxBefore}
                <mark className="rounded bg-attention/40 px-0.5 font-medium text-foreground">
                  {ctxTerm}
                </mark>
                {ctxAfter}
                {ctxAfter && "…"}
              </span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {f.cfr_ref && <span>{f.cfr_ref}</span>}
            {f.mpep_section && (
              <button
                type="button"
                onClick={() => onOpenRule(f.mpep_section!)}
                className="text-foreground underline-offset-2 hover:underline"
              >
                Open MPEP {f.mpep_section} →
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Link
              href={issueHref}
              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent/50"
            >
              Take me to issue →
            </Link>
            {f.actionable && (
              <Button
                size="sm"
                variant="outline"
                onClick={recheck}
                disabled={checking}
              >
                {checking ? "Checking…" : "Check if fixed"}
              </Button>
            )}
            {f.actionable && (
              <Button
                size="sm"
                variant="outline"
                onClick={autoFix}
                disabled={proposing || applying}
                data-testid="auto-fix"
              >
                {proposing ? "Drafting fix…" : "Auto-fix"}
              </Button>
            )}
            {verdict === "fixed" && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-pass">
                <Check className="size-3.5" aria-hidden /> Looks fixed
              </span>
            )}
            {verdict === "present" && (
              <span className="text-xs font-medium text-attention-foreground">
                Still present
              </span>
            )}
          </div>

          {fixErr && (
            <p className="text-xs text-violation" role="alert">
              {fixErr}
            </p>
          )}
          {proposal && (
            <FixProposal
              proposal={proposal}
              applying={applying}
              onAccept={acceptFix}
              onReject={() => setProposal(null)}
            />
          )}
        </div>
      )}
    </li>
  );
}
