"use client";

/**
 * The §101 walkthrough, shown in the evidence pane's place. Framed as a guide and never a
 * verdict: the heading says it is an AI read to verify, and the MPEP 2106 pin only appears
 * when it resolved against the corpus.
 */
import type { EligibilityAnalysis } from "@/features/review/domain/finding";

export type Eligibility = {
  claimNumber: number;
  claimText: string;
  analysis: EligibilityAnalysis;
  mpep: string | null;
};

export function EligibilityPanel({
  data,
  onOpenRule,
}: {
  data: Eligibility;
  onOpenRule: (n: string) => void;
}) {
  const a = data.analysis;
  const rows: [string, string][] = [
    ["Step 1 - Is it a process, machine, or thing?", a.category],
    ["Step 2A - Is it just an abstract idea or law of nature?", a.prong_one],
    ["Step 2A - Does it apply that idea in a practical way?", a.prong_two],
    ["Step 2B - Does it add significantly more?", a.step_2b],
    ["Summary", a.summary],
  ];
  return (
    <div className="space-y-3 px-6 py-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Patent eligibility - AI read, verify it
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Claim {data.claimNumber} · a guide, not a verdict
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
        An abstract idea or law of nature is patentable only when applied in a practical way.
        Verify each step.
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
