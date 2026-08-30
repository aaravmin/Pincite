"use client";

// The per-matter overview: the interactive findings table plus a checklist of
// every step with a live status. Presentation only - every number comes from
// getReadiness (server, RLS-scoped); no finding is changed here.

import Link from "next/link";
import { cn } from "@/shared/utils";
import { SignalMark } from "@visual/signal";
import { FindingsTable } from "@/features/projects/ui/overview/findings-table";
import type { Signal } from "@visual/types";
import type { Gate, Readiness } from "@/features/projects/domain/readiness";

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
  return (
    <div className="space-y-6">
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
