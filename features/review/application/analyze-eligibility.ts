import "server-only";

/**
 * The §101 Alice/Mayo subject-matter eligibility walkthrough (MPEP 2106) - the one
 * model-assisted check in the review feature.
 *
 * It is deliberately NOT a verdict: the prompt forbids an eligibility conclusion, the result
 * is labeled as the model's read to verify, and the MPEP 2106 pin is validated against the
 * corpus before it is offered (dropped if it does not resolve), exactly like a deterministic
 * finding. Rate-limited and budget-capped; synthetic/public text only until vendor ZDR is on.
 */
import type { TypedSupabaseClient } from "@/shared/db/types";
import { logAudit } from "@/shared/audit/log";
import { checkGlobalLimit, checkRateLimit } from "@/shared/rate-limit/check";
import { validateCitations } from "@/features/mpep/application/validate-citations";
import { parseClaims } from "@/features/review/domain/claims";
import {
  buildEligibilityPrompt,
  parseEligibilityResponse,
  pickIndependentClaim,
} from "@/features/review/domain/eligibility";
import type { EligibilityAnalysis } from "@/features/review/domain/finding";
import {
  loadDraftForReview,
  type ReviewDraft,
} from "@/features/review/infrastructure/draft-reader";
import { analyzeEligibilityWithModel } from "@/features/review/infrastructure/eligibility-analyzer";

const ELIGIBILITY_PER_HOUR = 30;
const HOUR_SECONDS = 3600;
const GROK_CALLS_PER_DAY = 300;
const DAY_SECONDS = 86400;
const ELIGIBILITY_MPEP = "2106";

export type AnalyzeEligibilityInput = {
  supabase: TypedSupabaseClient;
  userId: string;
  projectId: string;
};

export type AnalyzeEligibilityDeps = {
  loadDraft: (
    supabase: TypedSupabaseClient,
    projectId: string,
  ) => Promise<ReviewDraft>;
  checkRateLimit: typeof checkRateLimit;
  checkGlobalLimit: typeof checkGlobalLimit;
  analyze: (input: { system: string; prompt: string }) => Promise<string>;
  validateCitations: (pins: string[]) => Promise<ReadonlySet<string>>;
  logAudit: typeof logAudit;
};

export const defaultAnalyzeEligibilityDeps: AnalyzeEligibilityDeps = {
  loadDraft: loadDraftForReview,
  checkRateLimit,
  checkGlobalLimit,
  analyze: analyzeEligibilityWithModel,
  validateCitations,
  logAudit,
};

export type EligibilityResult = {
  ok: true;
  claimNumber: number;
  claimText: string;
  analysis: EligibilityAnalysis;
  mpep: string | null;
};

export async function analyzeEligibility(
  input: AnalyzeEligibilityInput,
  deps: AnalyzeEligibilityDeps = defaultAnalyzeEligibilityDeps,
): Promise<EligibilityResult | { error: string }> {
  const { sections } = await deps.loadDraft(input.supabase, input.projectId);
  const claims = sections["claims"] ?? "";
  if (!claims.trim()) return { error: "Add claims first." };

  const indep = pickIndependentClaim(parseClaims(claims));
  if (!indep) return { error: "No claim found." };

  const rl = await deps.checkRateLimit(
    input.supabase,
    "eligibility",
    ELIGIBILITY_PER_HOUR,
    HOUR_SECONDS,
  );
  if (!rl.allowed) return { error: rl.retryMessage };
  const budget = await deps.checkGlobalLimit(
    input.supabase,
    "grok_global_day",
    GROK_CALLS_PER_DAY,
    DAY_SECONDS,
  );
  if (!budget.allowed)
    return { error: "Daily §101 budget used up. Try again tomorrow." };

  const { system, prompt } = buildEligibilityPrompt(indep);
  let analysis: EligibilityAnalysis;
  try {
    analysis = parseEligibilityResponse(await deps.analyze({ system, prompt }));
  } catch (e) {
    return { error: `Model error: ${(e as Error).message}` };
  }

  const mpep = (await deps.validateCitations([ELIGIBILITY_MPEP])).has(
    ELIGIBILITY_MPEP,
  )
    ? ELIGIBILITY_MPEP
    : null;
  await deps.logAudit(input.supabase, {
    userId: input.userId,
    action: "findings_run",
    projectId: input.projectId,
    detail: { kind: "eligibility", claim: indep.number },
  });

  return {
    ok: true,
    claimNumber: indep.number,
    claimText: indep.raw,
    analysis,
    mpep,
  };
}
