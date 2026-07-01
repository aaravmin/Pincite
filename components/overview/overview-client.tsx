"use client";

// The per-matter command center. KPI cards animate on mount, the compliance
// Tracker previews a check on hover, the lifecycle timeline places the matter,
// and a single accent (the border beam) leads the eye to the next action.
// Presentation only - every number comes from getReadiness (server, RLS-scoped).

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { BorderBeam } from "@/components/ui/border-beam";
import { KpiStat } from "@visual/kpi-stat";
import { ComplianceTracker, type TrackerBlock } from "@visual/compliance-tracker";
import { LifecycleTimeline } from "@visual/lifecycle-timeline";
import { SignalMark } from "@visual/signal";
import { FindingsTable } from "@/components/overview/findings-table";
import { useMountProgress } from "@visual/reveal";
import type { Signal } from "@visual/types";
import type { Gate, Readiness } from "@/lib/readiness";

const STAGE_INDEX: Record<string, number> = {
  drafting: 0,
  filed: 1,
  published: 1,
  office_action: 2,
  allowed: 3,
  granted: 4,
};

function gateSignal(status: Gate["status"]): Signal {
  if (status === "done") return "green";
  if (status === "violation") return "red";
  if (status === "attention") return "yellow";
  return "neutral";
}

const GATE_WORD: Record<Gate["status"], string> = {
  done: "Passing",
  violation: "Action needed",
  attention: "Review",
  todo: "To do",
};

export function OverviewClient({ readiness: r }: { readiness: Readiness }) {
  const progress = useMountProgress(1000);
  const [activeGate, setActiveGate] = useState<string | null>(null);

  const blocks: TrackerBlock[] = r.gates.map((g) => ({
    id: g.key,
    signal: gateSignal(g.status),
    label: g.label,
    detail: g.detail,
  }));
  const active = r.gates.find((g) => g.key === activeGate) ?? null;

  // Count from the same list the findings table shows, so the KPI and the table
  // never disagree (the table includes filing-tier attention, not just tiers 1-3).
  const redTotal = r.findings.filter((f) => f.severity === "violation").length;
  const attnTotal = r.findings.filter((f) => f.severity === "attention").length;

  const currentIndex = STAGE_INDEX[r.project.declared_status] ?? 0;
  // Readiness is progress, not a pass/fail signal - only turn it green once it
  // is genuinely filing-ready, otherwise keep it neutral (no yellow warning).
  const readySignal: Signal = r.completeness >= 80 ? "green" : "neutral";

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiStat
          label="Open red issues"
          value={redTotal}
          progress={progress}
          signal={redTotal > 0 ? "red" : "green"}
          hint={
            redTotal > 0
              ? attnTotal > 0
                ? `${attnTotal} more to review`
                : "Fix before filing"
              : attnTotal > 0
                ? `${attnTotal} to review`
                : "None outstanding"
          }
        />
        <KpiStat
          label="Examiner readiness"
          value={r.completeness}
          suffix="%"
          progress={progress}
          signal={readySignal}
          hint="Filing completeness"
        />
        <KpiStat
          label={r.nextDeadline ? "Next deadline" : "Next step"}
          display={r.nextDeadline ? r.nextDeadline.label : (r.next?.label ?? "All done")}
          progress={progress}
          signal={r.nextDeadline ? "yellow" : "neutral"}
          hint={r.nextDeadline ? r.nextDeadline.detail : "Keep moving toward filing"}
        />
        <KpiStat
          label="Current stage"
          display={r.stage.label}
          progress={progress}
          hint={r.stage.signals[0]}
        />
      </div>

      {/* next-action card, the single accent */}
      {r.next && (
        <div className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm">
          <BorderBeam
            size={90}
            duration={7}
            colorFrom="var(--foreground)"
            colorTo="var(--muted-foreground)"
          />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Do this next
              </p>
              <p className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                {r.next.label}
              </p>
              {r.stage.missing[0] && (
                <p className="mt-1 text-sm text-muted-foreground">{r.stage.missing[0]}</p>
              )}
            </div>
            <Link
              href={r.next.href}
              className="inline-flex shrink-0 items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Go there
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* compliance tracker */}
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Compliance</h2>
            <span className="text-xs text-muted-foreground">
              {r.gates.length} checks on this matter
            </span>
          </div>
          <ComplianceTracker
            blocks={blocks}
            progress={progress}
            activeId={activeGate}
            onHover={setActiveGate}
          />
          {/* hover preview */}
          <div className="mt-4 min-h-[52px] rounded-lg border bg-muted/30 p-3">
            {active ? (
              <Link href={active.href} className="group flex items-start gap-2.5">
                <SignalMark signal={gateSignal(active.status)} className="mt-1" />
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{active.label}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {GATE_WORD[active.status]}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground group-hover:text-foreground">
                    {active.detail}
                  </span>
                </span>
              </Link>
            ) : (
              <p className="text-xs text-muted-foreground">
                Hover a block to preview the check and open its screen.
              </p>
            )}
          </div>
        </section>

        {/* lifecycle timeline */}
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Lifecycle</h2>
            <span className="text-xs text-muted-foreground">Draft to grant</span>
          </div>
          <LifecycleTimeline
            currentIndex={currentIndex}
            currentDetail={r.stage.label}
            nextMarker={r.nextDeadline ? { label: r.nextDeadline.label } : null}
            progress={progress}
          />
          {!r.nextDeadline && (
            <p className="mt-5 text-xs text-muted-foreground">
              No filing deadline yet. Deadlines appear once the application is filed.
            </p>
          )}
        </section>
      </div>

      {/* interactive findings table */}
      {r.findings.length > 0 && <FindingsTable findings={r.findings} />}

      {/* checklist */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Checklist
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {r.gates.map((g) => (
            <Link
              key={g.key}
              href={g.href}
              data-status={g.status}
              className={cn(
                "flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/40",
              )}
            >
              <SignalMark signal={gateSignal(g.status)} className="mt-1" />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{g.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  <span className="sr-only">{GATE_WORD[g.status]}. </span>
                  {g.detail}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
