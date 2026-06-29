"use server";

/**
 * Prior-art search orchestration (roadmap §4.6). Two entry points:
 *  - runPriorArtSearch: live — discover candidates on BigQuery from claim keywords, then
 *    pinpoint-match each against the user's limitations and persist ranked results.
 *  - compareAgainstCandidate: deterministic — match the claims against a supplied candidate
 *    text (manual comparison, and the basis for the repeatable verification gate; no cost).
 * Both persist prior_art_matches + match_spans (RLS-scoped) and audit the action. Synthetic
 * data only until vendor zero-retention is confirmed (docs/business-context.md).
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { getSectionContent } from "@/lib/projects/queries";
import { extractLimitations, claimKeywords } from "@/lib/patents/extract";
import { matchCandidate } from "@/lib/patents/match";
import { semanticScores } from "@/lib/patents/semantic";
import { searchCandidates, bigQueryConfigured } from "@/lib/patents/bigquery";
import { searchCandidatesKeyless } from "@/lib/patents/keyless";
import { checkRateLimit, checkGlobalLimit } from "@/lib/ratelimit";
import type { SpanMatch } from "@/lib/patents/match";
import type { Candidate } from "@/lib/patents/bigquery";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

type Persistable = {
  patent_number: string;
  title: string | null;
  source: "google_patents" | "uspto_odp" | "patentsview";
  source_url: string | null;
  overall_score: number;
  spans: SpanMatch[];
};

async function persist(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  projectId: string,
  matches: Persistable[],
) {
  // Latest search replaces prior results for the project (cascade clears spans).
  await supabase.from("prior_art_matches").delete().eq("project_id", projectId);
  for (const m of matches) {
    const { data: pam } = await supabase
      .from("prior_art_matches")
      .insert({
        project_id: projectId,
        patent_number: m.patent_number,
        title: m.title,
        source: m.source,
        source_url: m.source_url,
        overall_score: m.overall_score,
      })
      .select("id")
      .single();
    if (!pam || m.spans.length === 0) continue;
    await supabase.from("match_spans").insert(
      m.spans.map((s) => ({
        match_id: pam.id,
        user_section_key: "claims",
        user_span_start: s.userSpanStart,
        user_span_end: s.userSpanEnd,
        patent_span_text: s.patentSpanText,
        overlap_type: s.overlapType,
        element_confidence: s.confidence,
      })),
    );
  }
}

export async function runPriorArtSearch(
  projectId: string,
): Promise<
  | { ok: true; count: number; scanGB: number; source: "bigquery" | "google_patents" }
  | { error: string }
> {
  const { supabase, user } = await requireUser();
  const sections = await getSectionContent(projectId);
  const claims = sections["claims"] ?? "";
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
  // missing — no creds, an absent key file, or an auth/quota failure — degrades to the
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
  const matches: Persistable[] = candidates
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

  await persist(supabase, projectId, matches);
  await logAudit(supabase, {
    userId: user.id,
    action: "prior_art_searched",
    projectId,
    detail: { source, candidates: matches.length, bytesProcessed },
  });
  revalidatePath(`/projects/${projectId}/prior-art`);
  return {
    ok: true,
    count: matches.length,
    scanGB: +(bytesProcessed / 1e9).toFixed(2),
    source,
  };
}

export async function compareAgainstCandidate(input: {
  projectId: string;
  patentNumber: string;
  title?: string;
  text: string;
  sourceUrl?: string;
}): Promise<{ ok: true; count: number } | { error: string }> {
  const { supabase, user } = await requireUser();
  const sections = await getSectionContent(input.projectId);
  const claims = sections["claims"] ?? "";
  if (!claims.trim()) return { error: "Add claims to the project first." };

  const rl = await checkRateLimit(supabase, "prior_art_compare", 60, 3600);
  if (!rl.allowed) return { error: rl.retryMessage };

  const limitations = extractLimitations(claims);
  const m = matchCandidate(limitations, input.text);
  await persist(supabase, input.projectId, [
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
  revalidatePath(`/projects/${input.projectId}/prior-art`);
  return { ok: true, count: m.spans.length };
}
