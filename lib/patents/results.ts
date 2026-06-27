/** Read-side loader for the prior-art results view. RLS scopes to the owner. */
import { createClient } from "@/lib/supabase/server";

export type ResultSpan = {
  user_span_start: number;
  user_span_end: number;
  patent_span_text: string;
  overlap_type: "lexical" | "semantic" | "claim_limitation";
  element_confidence: number | null;
};

export type ResultMatch = {
  id: string;
  patent_number: string;
  title: string | null;
  source_url: string | null;
  overall_score: number | null;
  spans: ResultSpan[];
};

export async function getPriorArtResults(
  projectId: string,
): Promise<{ claims: string; matches: ResultMatch[] }> {
  const supabase = await createClient();
  const { data: sec } = await supabase
    .from("project_sections")
    .select("content")
    .eq("project_id", projectId)
    .eq("section_key", "claims")
    .maybeSingle();
  const claims = sec?.content ?? "";

  const { data: pam } = await supabase
    .from("prior_art_matches")
    .select("id, patent_number, title, source_url, overall_score")
    .eq("project_id", projectId)
    .order("overall_score", { ascending: false });

  const matches: ResultMatch[] = [];
  for (const m of pam ?? []) {
    const { data: spans } = await supabase
      .from("match_spans")
      .select(
        "user_span_start, user_span_end, patent_span_text, overlap_type, element_confidence",
      )
      .eq("match_id", m.id)
      .order("user_span_start");
    matches.push({ ...(m as Omit<ResultMatch, "spans">), spans: (spans as ResultSpan[]) ?? [] });
  }
  return { claims, matches };
}
