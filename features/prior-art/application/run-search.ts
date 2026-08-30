import "server-only";

/**
 * Live prior-art search (roadmap §4.6): discover candidates from claim keywords, then
 * pinpoint-match each against the user's limitations and persist ranked results. Synthetic
 * data only until vendor zero-retention is confirmed (docs/business-context.md).
 */
import type { User } from "@supabase/supabase-js";
import type { TypedSupabaseClient } from "@/shared/db/types";
import { logAudit } from "@/shared/audit/log";
import { checkGlobalLimit, checkRateLimit } from "@/shared/rate-limit/check";
import {
  claimKeywords,
  extractLimitations,
} from "@/features/prior-art/domain/extract";
import { matchCandidate } from "@/features/prior-art/domain/match";
import type {
  Candidate,
  PersistableMatch,
} from "@/features/prior-art/domain/types";
import {
  bigQueryConfigured,
  searchCandidates,
} from "@/features/prior-art/infrastructure/bigquery";
import { searchCandidatesKeyless } from "@/features/prior-art/infrastructure/keyless";
import { semanticScores } from "@/features/prior-art/infrastructure/semantic";
import {
  loadClaimsText,
  replaceMatches,
} from "@/features/prior-art/infrastructure/matches-repository";

export type RunSearchResult =
  | { ok: true; count: number; scanGB: number; source: "bigquery" | "google_patents" }
  | { error: string };

export async function runSearch(
  supabase: TypedSupabaseClient,
  user: User,
  projectId: string,
): Promise<RunSearchResult> {
  const claims = await loadClaimsText(supabase, projectId);
  if (!claims.trim()) return { error: "Add claims to the project first." };

  // A live search is a network call on either path; cap per user by hour and day.
  const rlHour = await checkRateLimit(supabase, "prior_art_live_hour", 6, 3600);
  if (!rlHour.allowed) return { error: rlHour.retryMessage };
  const rlDay = await checkRateLimit(supabase, "prior_art_live_day", 20, 86400);
  if (!rlDay.allowed) return { error: rlDay.retryMessage };

  const limitations = extractLimitations(claims);
  const keywords = claimKeywords(claims, 8);

  let candidates: Candidate[] = [];
  let bytesProcessed = 0;
  let source: "bigquery" | "google_patents" = "google_patents";

  // Prefer BigQuery only when it is actually usable here; that path is the one that bills,
  // so it also carries the account-wide monthly budget (kept inside the free tier). Anything
  // missing - no creds, an absent key file, or an auth/quota failure - degrades to the
  // keyless Google Patents search, so the feature works on any machine with no setup.
  if (bigQueryConfigured()) {
    const budget = await checkGlobalLimit(supabase, "bq_global_month", 7, 2592000);
    if (budget.allowed) {
      try {
        const res = await searchCandidates({ keywords, limit: 15 });
        candidates = res.candidates;
        bytesProcessed = res.bytesProcessed;
        source = "bigquery";
      } catch {
        source = "google_patents";
      }
    }
  }
  if (source !== "bigquery") {
    try {
      const res = await searchCandidatesKeyless({ keywords, limit: 15 });
      candidates = res.candidates;
    } catch (e) {
      return { error: `Prior-art search failed: ${(e as Error).message}` };
    }
  }

  const candTexts = candidates.map((c) =>
    [c.title, c.abstract].filter(Boolean).join(". "),
  );
  // Semantic ranking layered on the lexical pinpoint score; [] if Voyage is unavailable.
  const sem = await semanticScores(claims, candTexts);
  const matches: PersistableMatch[] = candidates
    .map((c, idx) => {
      const m = matchCandidate(limitations, candTexts[idx]);
      const overall = sem.length
        ? Number((0.7 * m.overallScore + 0.3 * (sem[idx] ?? 0)).toFixed(2))
        : m.overallScore;
      return {
        patent_number: c.publication_number,
        title: c.title,
        source: "google_patents" as const,
        source_url: c.source_url,
        overall_score: overall,
        spans: m.spans,
      };
    })
    .filter((m) => m.overall_score > 0)
    .sort((a, b) => b.overall_score - a.overall_score);

  await replaceMatches(supabase, projectId, matches);
  await logAudit(supabase, {
    userId: user.id,
    action: "prior_art_searched",
    projectId,
    detail: { source, candidates: matches.length, bytesProcessed },
  });
  return {
    ok: true,
    count: matches.length,
    scanGB: +(bytesProcessed / 1e9).toFixed(2),
    source,
  };
}
