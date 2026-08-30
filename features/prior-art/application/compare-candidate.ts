import "server-only";

/**
 * Deterministic comparison against one supplied patent text. No provider
 * call and no BigQuery cost, which also makes it the repeatable verification-gate path.
 */
import type { User } from "@supabase/supabase-js";
import type { TypedSupabaseClient } from "@/shared/db/types";
import { logAudit } from "@/shared/audit/log";
import { checkRateLimit } from "@/shared/rate-limit/check";
import { extractLimitations } from "@/features/prior-art/domain/extract";
import { matchCandidate } from "@/features/prior-art/domain/match";
import {
  loadClaimsText,
  replaceMatches,
} from "@/features/prior-art/infrastructure/matches-repository";

export type CompareInput = {
  projectId: string;
  patentNumber: string;
  title?: string;
  text: string;
  sourceUrl?: string;
};

export async function compareCandidate(
  supabase: TypedSupabaseClient,
  user: User,
  input: CompareInput,
): Promise<{ ok: true; count: number } | { error: string }> {
  const claims = await loadClaimsText(supabase, input.projectId);
  if (!claims.trim()) return { error: "Add claims to the project first." };

  const rl = await checkRateLimit(supabase, "prior_art_compare", 60, 3600);
  if (!rl.allowed) return { error: rl.retryMessage };

  const limitations = extractLimitations(claims);
  const m = matchCandidate(limitations, input.text);
  await replaceMatches(supabase, input.projectId, [
    {
      patent_number: input.patentNumber,
      title: input.title ?? null,
      source: "google_patents",
      source_url: input.sourceUrl ?? null,
      overall_score: m.overallScore,
      spans: m.spans,
    },
  ]);
  await logAudit(supabase, {
    userId: user.id,
    action: "prior_art_searched",
    projectId: input.projectId,
    detail: { source: "manual", candidate: input.patentNumber },
  });
  return { ok: true, count: m.spans.length };
}
