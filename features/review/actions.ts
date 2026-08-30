"use server";

/**
 * The review feature's server actions. Each one authenticates, calls exactly one application
 * operation, revalidates the paths whose rendered output the operation changed, and returns a
 * serializable result. No validator logic and no database queries live here.
 */
import { revalidatePath } from "next/cache";
import { requireViewer } from "@/shared/auth/require-viewer";
import type { MpepSection } from "@/features/mpep/domain/types";
import { analyzeEligibility as analyzeEligibilityOp } from "@/features/review/application/analyze-eligibility";
import { applyFix as applyFixOp } from "@/features/review/application/apply-fix";
import { getRuleSection as getRuleSectionOp } from "@/features/review/application/get-rule-section";
import { proposeFix as proposeFixOp } from "@/features/review/application/propose-fix";
import { recheckFinding as recheckFindingOp } from "@/features/review/application/recheck-finding";
import { runReview } from "@/features/review/application/run-review";
import type { EligibilityAnalysis } from "@/features/review/domain/finding";

export async function runValidators(
  projectId: string,
): Promise<{ ok: true; count: number; dropped: number } | { error: string }> {
  const { supabase, user } = await requireViewer();
  const { findings, dropped } = await runReview({
    supabase,
    userId: user.id,
    projectId,
  });
  revalidatePath(`/projects/${projectId}/review`);
  return { ok: true, count: findings.length, dropped };
}

export async function recheckFinding(
  projectId: string,
  sectionKey: string,
  title: string,
): Promise<{ ok: true; fixed: boolean; total: number } | { error: string }> {
  const { supabase, user } = await requireViewer();
  const { fixed, total } = await recheckFindingOp({
    supabase,
    userId: user.id,
    projectId,
    sectionKey,
    title,
  });
  revalidatePath(`/projects/${projectId}/review`);
  return { ok: true, fixed, total };
}

export async function proposeFix(input: {
  projectId: string;
  sectionKey: string;
  spanStart: number;
  spanEnd: number;
  title: string;
  explanation: string;
  cfrRef: string | null;
}): Promise<
  { ok: true; before: string; after: string; note: string } | { error: string }
> {
  const { supabase } = await requireViewer();
  return proposeFixOp({ supabase, ...input });
}

export async function applyFix(input: {
  projectId: string;
  sectionKey: string;
  before: string;
  after: string;
  spanStart: number;
}): Promise<{ ok: true } | { error: string }> {
  const { supabase, user } = await requireViewer();
  const result = await applyFixOp({ supabase, userId: user.id, ...input });
  if ("error" in result) return result;
  revalidatePath(`/projects/${input.projectId}/review`);
  revalidatePath(`/projects/${input.projectId}`);
  return result;
}

export async function getRuleSection(
  sectionNumber: string,
): Promise<MpepSection | null> {
  await requireViewer();
  return getRuleSectionOp(sectionNumber);
}

export async function analyzeEligibility(projectId: string): Promise<
  | {
      ok: true;
      claimNumber: number;
      claimText: string;
      analysis: EligibilityAnalysis;
      mpep: string | null;
    }
  | { error: string }
> {
  const { supabase, user } = await requireViewer();
  return analyzeEligibilityOp({ supabase, userId: user.id, projectId });
}
