import "server-only";

/**
 * Re-check a single issue the user believes they fixed. Re-runs the validators over the
 * current text and reports whether an issue with the same section and title still appears -
 * the same run that backs the full check, so "Check if fixed" can never disagree with the
 * list beside it. The stored findings are refreshed as a side effect.
 */
import type { TypedSupabaseClient } from "@/shared/db/types";
import {
  computeAndPersistFindings,
  defaultRunReviewDeps,
  type RunReviewDeps,
} from "@/features/review/application/run-review";

export type RecheckFindingInput = {
  supabase: TypedSupabaseClient;
  userId: string;
  projectId: string;
  sectionKey: string;
  title: string;
};

export async function recheckFinding(
  input: RecheckFindingInput,
  deps: RunReviewDeps = defaultRunReviewDeps,
): Promise<{ fixed: boolean; total: number }> {
  const { findings } = await computeAndPersistFindings(input, deps);
  const stillPresent = findings.some(
    (f) => f.section_key === input.sectionKey && f.title === input.title,
  );

  await deps.logAudit(input.supabase, {
    userId: input.userId,
    action: "findings_run",
    projectId: input.projectId,
    detail: { kind: "recheck", section: input.sectionKey, fixed: !stillPresent },
  });

  return { fixed: !stillPresent, total: findings.length };
}
