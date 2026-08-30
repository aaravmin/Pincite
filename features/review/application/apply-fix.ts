import "server-only";

/**
 * Guided auto-fix, step 2: apply an accepted {before, after} edit to the section - replacing
 * the occurrence nearest the flagged span, so an identical phrase elsewhere in the section is
 * left alone - save it, and recompute the findings so the list reflects the new text.
 *
 * The edit is recorded in the audit log as a section edit marked `autofix`, so the history
 * distinguishes what the user typed from what they accepted from the model.
 */
import type { TypedSupabaseClient } from "@/shared/db/types";
import { logAudit } from "@/shared/audit/log";
import type { SectionKey } from "@/features/projects/domain/sections";
import { applyReplacement } from "@/features/review/domain/fix";
import {
  loadDraftForReview,
  type ReviewDraft,
} from "@/features/review/infrastructure/draft-reader";
import { upsertSectionContent } from "@/features/review/infrastructure/section-writer";
import {
  computeAndPersistFindings,
  defaultRunReviewDeps,
  type ReviewRun,
} from "@/features/review/application/run-review";

export type ApplyFixInput = {
  supabase: TypedSupabaseClient;
  userId: string;
  projectId: string;
  sectionKey: string;
  before: string;
  after: string;
  spanStart: number;
};

export type ApplyFixDeps = {
  loadDraft: (
    supabase: TypedSupabaseClient,
    projectId: string,
  ) => Promise<ReviewDraft>;
  saveSection: typeof upsertSectionContent;
  logAudit: typeof logAudit;
  recompute: (input: {
    supabase: TypedSupabaseClient;
    projectId: string;
  }) => Promise<ReviewRun>;
};

export const defaultApplyFixDeps: ApplyFixDeps = {
  loadDraft: loadDraftForReview,
  saveSection: upsertSectionContent,
  logAudit,
  recompute: (input) => computeAndPersistFindings(input, defaultRunReviewDeps),
};

export async function applyFix(
  input: ApplyFixInput,
  deps: ApplyFixDeps = defaultApplyFixDeps,
): Promise<{ ok: true } | { error: string }> {
  const { sections } = await deps.loadDraft(input.supabase, input.projectId);
  const sectionKey = input.sectionKey as SectionKey;
  const content = sections[sectionKey] ?? "";

  const next = applyReplacement(
    content,
    input.before,
    input.after,
    input.spanStart,
  );
  if (next === null) return { error: "Text changed since the fix - re-run it." };

  const { error } = await deps.saveSection(input.supabase, {
    projectId: input.projectId,
    sectionKey,
    content: next,
  });
  if (error) return { error };

  await deps.logAudit(input.supabase, {
    userId: input.userId,
    action: "section_edited",
    projectId: input.projectId,
    detail: { section: input.sectionKey, autofix: true },
  });
  await deps.recompute({
    supabase: input.supabase,
    projectId: input.projectId,
  });
  return { ok: true };
}
