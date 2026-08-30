import "server-only";

/**
 * Guided auto-fix (Feature 4), step 1: ask the model for the smallest edit that resolves ONE
 * flagged finding, returned as an exact {before, after} substring pair so the UI can show a
 * before/after diff. Nothing is changed here - the user accepts the edit (applyFix) or
 * rejects it. Manual per finding, never a magic wand.
 *
 * Synthetic/public text only until vendor ZDR is on. The rate limit and the daily budget cap
 * are checked BEFORE the draft is loaded, so a throttled caller costs a quota check and
 * nothing else.
 */
import type { TypedSupabaseClient } from "@/shared/db/types";
import { checkGlobalLimit, checkRateLimit } from "@/shared/rate-limit/check";
import {
  SECTION_LABELS,
  type SectionKey,
} from "@/features/projects/domain/sections";
import {
  buildFixPrompt,
  markSpan,
  parseFixResponse,
  type ProposedFix,
} from "@/features/review/domain/fix";
import {
  loadDraftForReview,
  type ReviewDraft,
} from "@/features/review/infrastructure/draft-reader";
import { proposeFixWithModel } from "@/features/review/infrastructure/fix-proposer";

const AUTOFIX_PER_HOUR = 30;
const HOUR_SECONDS = 3600;
const GROK_CALLS_PER_DAY = 300;
const DAY_SECONDS = 86400;

export type ProposeFixInput = {
  supabase: TypedSupabaseClient;
  projectId: string;
  sectionKey: string;
  spanStart: number;
  spanEnd: number;
  title: string;
  explanation: string;
  cfrRef: string | null;
};

export type ProposeFixDeps = {
  checkRateLimit: typeof checkRateLimit;
  checkGlobalLimit: typeof checkGlobalLimit;
  loadDraft: (
    supabase: TypedSupabaseClient,
    projectId: string,
  ) => Promise<ReviewDraft>;
  propose: (input: { system: string; prompt: string }) => Promise<string>;
};

export const defaultProposeFixDeps: ProposeFixDeps = {
  checkRateLimit,
  checkGlobalLimit,
  loadDraft: loadDraftForReview,
  propose: proposeFixWithModel,
};

export async function proposeFix(
  input: ProposeFixInput,
  deps: ProposeFixDeps = defaultProposeFixDeps,
): Promise<({ ok: true } & ProposedFix) | { error: string }> {
  const rl = await deps.checkRateLimit(
    input.supabase,
    "grok_autofix",
    AUTOFIX_PER_HOUR,
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
    return { error: "Daily AI budget used up. Try again tomorrow." };

  const { sections } = await deps.loadDraft(input.supabase, input.projectId);
  const content = sections[input.sectionKey] ?? "";
  if (!content.trim()) return { error: "No text in this section to fix." };

  const { system, prompt } = buildFixPrompt({
    label: SECTION_LABELS[input.sectionKey as SectionKey] ?? input.sectionKey,
    title: input.title,
    explanation: input.explanation,
    cfrRef: input.cfrRef,
    marked: markSpan(content, input.spanStart, input.spanEnd),
  });

  let text: string;
  try {
    text = await deps.propose({ system, prompt });
  } catch (err) {
    return { error: `Model error: ${(err as Error).message}` };
  }

  const proposal = parseFixResponse(text);
  // The model must quote the original text back verbatim; anything else would be applied to
  // the wrong span, or to nothing at all.
  if (!proposal || !content.includes(proposal.before)) {
    return { error: "Couldn't draft a precise fix - edit it by hand." };
  }
  if (proposal.before === proposal.after)
    return { error: "No change was proposed." };

  return { ok: true, ...proposal };
}
