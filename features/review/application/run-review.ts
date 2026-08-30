import "server-only";

/**
 * Run the deterministic validators over a matter's current saved text and replace its stored
 * findings (roadmap §4.3).
 *
 * Every finding's MPEP pin is validated against the corpus before it is stored: an
 * unresolved pin is dropped (set null) rather than shown, and the number dropped is reported
 * so the run can be audited. That is the anti-hallucination spine - no claim reaches the
 * screen without a citation that resolves to real text.
 *
 * Deterministic and cheap (no model call), so it is safe to re-run on every recheck and
 * after every accepted auto-fix.
 */
import type { TypedSupabaseClient } from "@/shared/db/types";
import { logAudit } from "@/shared/audit/log";
import { validateCitations } from "@/features/mpep/application/validate-citations";
import {
  collectFindingPins,
  dropUnresolvedPins,
} from "@/features/review/domain/citations";
import type { Finding } from "@/features/review/domain/finding";
import { runDeterministicValidators } from "@/features/review/domain/run-validators";
import {
  loadDraftForReview,
  type ReviewDraft,
} from "@/features/review/infrastructure/draft-reader";
import { replaceFindings } from "@/features/review/infrastructure/findings-repository";

export type RunReviewInput = {
  supabase: TypedSupabaseClient;
  userId: string;
  projectId: string;
};

export type RunReviewDeps = {
  loadDraft: (
    supabase: TypedSupabaseClient,
    projectId: string,
  ) => Promise<ReviewDraft>;
  validateCitations: (pins: string[]) => Promise<ReadonlySet<string>>;
  replaceFindings: (
    supabase: TypedSupabaseClient,
    projectId: string,
    findings: Finding[],
  ) => Promise<void>;
  logAudit: typeof logAudit;
};

export const defaultRunReviewDeps: RunReviewDeps = {
  loadDraft: loadDraftForReview,
  validateCitations,
  replaceFindings,
  logAudit,
};

export type ReviewRun = { findings: Finding[]; dropped: number };

/**
 * The shared core: validate, resolve pins, persist. Used by the explicit "Check for issues"
 * run, by a single-finding recheck, and by the recompute that follows an accepted auto-fix,
 * so all three always agree about what is currently wrong with the draft.
 */
export async function computeAndPersistFindings(
  input: { supabase: TypedSupabaseClient; projectId: string },
  deps: RunReviewDeps = defaultRunReviewDeps,
): Promise<ReviewRun> {
  const draft = await deps.loadDraft(input.supabase, input.projectId);
  const computed = runDeterministicValidators(draft.sections, draft.patentType);

  const valid = await deps.validateCitations(collectFindingPins(computed));
  const { findings, dropped } = dropUnresolvedPins(computed, valid);

  await deps.replaceFindings(input.supabase, input.projectId, findings);
  return { findings, dropped };
}

export async function runReview(
  input: RunReviewInput,
  deps: RunReviewDeps = defaultRunReviewDeps,
): Promise<ReviewRun> {
  const { findings, dropped } = await computeAndPersistFindings(input, deps);

  await deps.logAudit(input.supabase, {
    userId: input.userId,
    action: "findings_run",
    projectId: input.projectId,
    detail: { count: findings.length, dropped },
  });

  return { findings, dropped };
}
