"use client";

/**
 * The Review screen's action bar: run the deterministic check, run the §101 walkthrough, and
 * the running tally. The tally is text, not color alone.
 */
import { Button } from "@/components/ui/button";

export function ReviewToolbar({
  pending,
  message,
  violations,
  attention,
  onCheck,
  onAnalyzeEligibility,
}: {
  pending: boolean;
  message: string | null;
  violations: number;
  attention: number;
  onCheck: () => void;
  onAnalyzeEligibility: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-6 py-3">
      <Button size="sm" onClick={onCheck} disabled={pending} data-testid="run-check">
        {pending ? "Checking…" : "Check for issues"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={onAnalyzeEligibility}
        disabled={pending}
        data-testid="analyze-101"
        title="Walk the §101 eligibility test for a claim."
      >
        Check patent eligibility
      </Button>
      {message && <span className="text-xs text-muted-foreground">{message}</span>}
      <span className="ml-auto text-xs text-muted-foreground">
        {violations} violation(s) · {attention} attention
      </span>
    </div>
  );
}
