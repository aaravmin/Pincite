"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EvidencePane } from "@/components/mpep/evidence-pane";
import {
  runValidators,
  recheckFinding,
  getRuleSection,
  analyzeEligibility,
  proposeFix,
  applyFix,
} from "@/lib/validators/run";
import type { MpepSection } from "@/lib/mpep/load";
import type { FindingRow } from "@/lib/validators/results";
import type { EligibilityAnalysis } from "@/lib/validators/types";

type Eligibility = {
  claimNumber: number;
  claimText: string;
  analysis: EligibilityAnalysis;
  mpep: string | null;
};

// Process areas so the user sees WHERE a problem sits, not just a flat wall.
const AREAS = ["Claims", "Draft"] as const;
const areaOf = (f: FindingRow): string =>
  f.section_key === "claims" ? "Claims" : "Draft";

export function ReviewClient({
  projectId,
  sections,
  findings,
}: {
  projectId: string;
  sections: Record<string, string>;
  findings: FindingRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [rule, setRule] = useState<MpepSection | null>(null);
  const [elig, setElig] = useState<Eligibility | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function check() {
    setMsg(null);
    start(async () => {
      const r = await runValidators(projectId);
      if ("error" in r) return setMsg(r.error);
      setMsg(`${r.count} finding(s).`);
      router.refresh();
    });
  }

  function openRule(num: string) {
    setElig(null);
    start(async () => setRule(await getRuleSection(num)));
  }

  // One click on a finding shows its reasoning and opens its pinned rule beside the draft.
  function selectFinding(f: FindingRow) {
    setSelectedId((prev) => (prev === f.id ? null : f.id));
    if (f.mpep_section) openRule(f.mpep_section);
  }

  function analyze101() {
    setMsg(null);
    start(async () => {
      const r = await analyzeEligibility(projectId);
      if ("error" in r) return setMsg(r.error);
      setRule(null);
      setElig(r);
    });
  }

  const violations = findings.filter((f) => f.severity === "violation");
  const attention = findings.filter((f) => f.severity === "attention");
  const ordered = [...violations, ...attention];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-6 py-3">
        <Button size="sm" onClick={check} disabled={pending} data-testid="run-check">
          {pending ? "Checking…" : "Check for issues"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={analyze101}
          disabled={pending}
          data-testid="analyze-101"
          title="Section 101 patent eligibility: whether the claim is even the kind of thing that can be patented (the Alice/Mayo test)."
        >
          Analyze §101
        </Button>
        {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
        <span className="ml-auto text-xs text-muted-foreground">
          {violations.length} violation(s) · {attention.length} attention
        </span>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="w-1/2 shrink-0 overflow-auto border-r border-border px-6 py-4">
          {findings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No findings yet. Run a check.
            </p>
          ) : (
            <div className="space-y-5">
              {AREAS.map((area) => {
                const items = ordered.filter((f) => areaOf(f) === area);
                if (items.length === 0) return null;
                return (
                  <div key={area}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {area} ({items.length})
                    </p>
                    <ul className="space-y-2">
                      {items.map((f) => (
                        <FindingItem
                          key={f.id}
                          f={f}
                          projectId={projectId}
                          sections={sections}
                          selected={selectedId === f.id}
                          onSelect={() => selectFinding(f)}
                          onOpenRule={openRule}
                        />
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 overflow-auto" data-testid="rule-pane">
          {elig ? (
            <EligibilityPanel data={elig} onOpenRule={openRule} />
          ) : rule ? (
            <EvidencePane section={rule} span={null} />
          ) : (
            <p className="px-6 py-4 text-sm text-muted-foreground">
              Pick a finding to see the reasoning and its rule here, or analyze §101
              eligibility.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function FindingItem({
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
  const [proposal, setProposal] = useState<
    { before: string; after: string; note: string } | null
  >(null);
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
  const ctxBefore = hasSpan ? sec.slice(Math.max(0, f.span_start - 45), f.span_start) : "";
  const ctxTerm = hasSpan ? sec.slice(f.span_start, f.span_end) : "";
  const ctxAfter = hasSpan ? sec.slice(f.span_end, Math.min(sec.length, f.span_end + 45)) : "";
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
              <span className="font-medium text-foreground">What triggered this: </span>
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
                Still present, not resolved yet
              </span>
            )}
          </div>

          {fixErr && (
            <p className="text-xs text-violation" role="alert">
              {fixErr}
            </p>
          )}
          {proposal && (
            <FixDiff
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

/** A GitHub-style before/after for one proposed auto-fix: the removed text, the added text,
 *  and accept/reject. Color carries a label and a +/- marker too, never color alone. */
function FixDiff({
  proposal,
  applying,
  onAccept,
  onReject,
}: {
  proposal: { before: string; after: string; note: string };
  applying: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div className="space-y-2 rounded-md border border-border p-2" data-testid="fix-diff">
      {proposal.note && (
        <p className="text-xs text-muted-foreground">{proposal.note}</p>
      )}
      <div className="overflow-hidden rounded border border-border font-mono text-xs">
        <div className="flex gap-2 border-b border-border bg-violation-bg px-2 py-1">
          <span className="select-none font-sans font-medium text-violation">- Before</span>
          <span className="min-w-0 whitespace-pre-wrap break-words text-foreground">
            {proposal.before}
          </span>
        </div>
        <div className="flex gap-2 bg-pass/10 px-2 py-1">
          <span className="select-none font-sans font-medium text-pass">+ After</span>
          <span className="min-w-0 whitespace-pre-wrap break-words text-foreground">
            {proposal.after}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onAccept}
          disabled={applying}
          data-testid="accept-fix"
        >
          {applying ? "Applying…" : "Accept edit"}
        </Button>
        <Button size="sm" variant="outline" onClick={onReject} disabled={applying}>
          Reject
        </Button>
      </div>
    </div>
  );
}

function EligibilityPanel({
  data,
  onOpenRule,
}: {
  data: Eligibility;
  onOpenRule: (n: string) => void;
}) {
  const a = data.analysis;
  const rows: [string, string][] = [
    ["Step 1 - statutory category", a.category],
    ["Step 2A Prong 1 - judicial exception", a.prong_one],
    ["Step 2A Prong 2 - practical application", a.prong_two],
    ["Step 2B - significantly more", a.step_2b],
    ["Summary", a.summary],
  ];
  return (
    <div className="space-y-3 px-6 py-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          §101 eligibility - the model&apos;s read, verify
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Claim {data.claimNumber} · framework only, not a verdict
          {data.mpep && (
            <>
              {" · "}
              <button
                type="button"
                onClick={() => onOpenRule(data.mpep!)}
                className="underline-offset-2 hover:underline"
              >
                MPEP {data.mpep}
              </button>
            </>
          )}
        </p>
      </div>
      <div className="rounded-md border border-border bg-secondary/30 px-3 py-2 text-xs leading-5 text-muted-foreground">
        <span className="font-medium text-foreground">What is §101? </span>
        Section 101 asks whether a claim is even eligible for a patent at all. An abstract
        idea, a law of nature, or a natural phenomenon is not, unless the claim adds enough to
        apply it in a practical way. The steps below walk the USPTO Alice/Mayo test; this is a
        framework to verify, not a yes-or-no verdict.
      </div>
      {rows.map(([label, text]) => (
        <div key={label}>
          <p className="text-xs font-medium text-foreground">{label}</p>
          <p className="text-sm text-muted-foreground">{text || "-"}</p>
        </div>
      ))}
    </div>
  );
}
