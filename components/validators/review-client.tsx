"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EvidencePane } from "@/components/mpep/evidence-pane";
import { runValidators, getRuleSection, analyzeEligibility } from "@/lib/validators/run";
import type { MpepSection } from "@/lib/mpep/load";
import type { FindingRow } from "@/lib/validators/results";
import type { EligibilityAnalysis } from "@/lib/validators/types";

type Eligibility = {
  claimNumber: number;
  claimText: string;
  analysis: EligibilityAnalysis;
  mpep: string | null;
};

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

        <div className="min-w-0 flex-1 overflow-auto" data-testid="rule-pane">
          {elig ? (
            <EligibilityPanel data={elig} onOpenRule={openRule} />
          ) : rule ? (
            <EvidencePane section={rule} span={null} />
          ) : (
            <p className="px-6 py-4 text-sm text-muted-foreground">
              Open a finding&apos;s rule, or analyze §101 eligibility, to read it here.
            </p>
          )}
        </div>
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
    ["Step 1 — statutory category", a.category],
    ["Step 2A Prong 1 — judicial exception", a.prong_one],
    ["Step 2A Prong 2 — practical application", a.prong_two],
    ["Step 2B — significantly more", a.step_2b],
    ["Summary", a.summary],
  ];
  return (
    <div className="space-y-3 px-6 py-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          §101 eligibility — the model&apos;s read, verify
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
      {rows.map(([label, text]) => (
        <div key={label}>
          <p className="text-xs font-medium text-foreground">{label}</p>
          <p className="text-sm text-muted-foreground">{text || "—"}</p>
        </div>
      ))}
    </div>
  );
}
