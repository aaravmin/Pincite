"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EvidencePane } from "@/components/mpep/evidence-pane";
import { runValidators, getRuleSection } from "@/lib/validators/run";
import type { MpepSection } from "@/lib/mpep/load";
import type { FindingRow } from "@/lib/validators/results";

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
    start(async () => setRule(await getRuleSection(num)));
  }

  const violations = findings.filter((f) => f.severity === "violation");
  const attention = findings.filter((f) => f.severity === "attention");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-6 py-3">
        <Button size="sm" onClick={check} disabled={pending} data-testid="run-check">
          {pending ? "Checking…" : "Check for issues"}
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
            <ul className="space-y-3">
              {[...violations, ...attention].map((f) => (
                <li
                  key={f.id}
                  data-severity={f.severity}
                  className="rounded-md border border-border p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {f.severity === "violation" ? (
                      <span
                        className="inline-block size-2 rounded-full bg-violation"
                        aria-hidden
                      />
                    ) : (
                      <span
                        className="inline-block size-2 rounded-full border border-attention"
                        aria-hidden
                      />
                    )}
                    <span
                      className={
                        "text-xs font-medium " +
                        (f.severity === "violation"
                          ? "text-violation"
                          : "text-attention-foreground")
                      }
                    >
                      {f.severity === "violation" ? "Violation" : "Attention"}
                    </span>
                    <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {f.actionable ? "Fixable" : "Informational"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-foreground">{f.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {f.explanation}
                  </p>
                  {sections[f.section_key] && f.span_end > f.span_start && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      in {f.section_key}: “
                      {sections[f.section_key]
                        .slice(f.span_start, f.span_end)
                        .slice(0, 80)}
                      ”
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {f.cfr_ref && <span>{f.cfr_ref}</span>}
                    {f.mpep_section && (
                      <button
                        type="button"
                        onClick={() => openRule(f.mpep_section!)}
                        className="underline-offset-2 hover:underline"
                      >
                        Open MPEP {f.mpep_section}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="min-w-0 flex-1" data-testid="rule-pane">
          {rule ? (
            <EvidencePane section={rule} span={null} />
          ) : (
            <p className="px-6 py-4 text-sm text-muted-foreground">
              Open a finding&apos;s rule to read it here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
