import "server-only";

/**
 * Persistence for prior-art results. RLS scopes every row to the owner; the client is
 * passed in so one request reuses one client and tests can substitute a fake.
 */
import type { TypedSupabaseClient } from "@/shared/db/types";
import type {
  PersistableMatch,
  ResultMatch,
  ResultSpan,
} from "@/features/prior-art/domain/types";

/**
 * The claims text a search compares against. Read as a single targeted row (rather than
 * through the projects loader) so the prior-art screen does exactly one section query.
 */
export async function loadClaimsText(
  supabase: TypedSupabaseClient,
  projectId: string,
): Promise<string> {
  const { data } = await supabase
    .from("project_sections")
    .select("content")
    .eq("project_id", projectId)
    .eq("section_key", "claims")
    .maybeSingle();
  return data?.content ?? "";
}

/** Every match for a project, best score first, each with its spans in claim order. */
export async function loadMatches(
  supabase: TypedSupabaseClient,
  projectId: string,
): Promise<ResultMatch[]> {
  const { data: rows } = await supabase
    .from("prior_art_matches")
    .select("id, patent_number, title, source_url, overall_score")
    .eq("project_id", projectId)
    .order("overall_score", { ascending: false });

  const matches: ResultMatch[] = (rows ?? []).map((m) => ({
    id: m.id,
    patent_number: m.patent_number,
    title: m.title,
    source_url: m.source_url,
    overall_score: m.overall_score,
    spans: [],
  }));
  if (matches.length === 0) return matches;

  // One query for every match's spans, grouped in memory - a per-match query here was an
  // N+1 over match_spans. Ordering by user_span_start keeps each group in claim order.
  const byId = new Map(matches.map((m) => [m.id, m]));
  const { data: spans } = await supabase
    .from("match_spans")
    .select(
      "match_id, user_span_start, user_span_end, patent_span_text, overlap_type, element_confidence",
    )
    .in(
      "match_id",
      matches.map((m) => m.id),
    )
    .order("user_span_start");
  for (const s of spans ?? []) {
    const span: ResultSpan = {
      user_span_start: s.user_span_start,
      user_span_end: s.user_span_end,
      patent_span_text: s.patent_span_text,
      overlap_type: s.overlap_type,
      element_confidence: s.element_confidence,
    };
    byId.get(s.match_id)?.spans.push(span);
  }
  return matches;
}

/**
 * Replace the project's results with a new set. The latest search supersedes the prior one
 * (deleting the matches cascades to their spans).
 */
export async function replaceMatches(
  supabase: TypedSupabaseClient,
  projectId: string,
  matches: PersistableMatch[],
): Promise<void> {
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
        user_section_key: "claims" as const,
        user_span_start: s.userSpanStart,
        user_span_end: s.userSpanEnd,
        patent_span_text: s.patentSpanText,
        overlap_type: s.overlapType,
        element_confidence: s.confidence,
      })),
    );
  }
}
