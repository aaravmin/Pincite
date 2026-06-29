/**
 * Locate the responsive MPEP section(s) for a question or finding (roadmap §4.5 "locate").
 * Order of preference: an explicit, corpus-resolved section number; then semantic search
 * over the embedded chunks (Voyage + pgvector); then keyword full-text search as a
 * resilient fallback when embeddings are unavailable or throttled.
 */
import { createClient } from "@/lib/supabase/server";
import { embedOne } from "@/lib/embeddings/voyage";

export type LocatedSection = {
  section_number: string;
  title: string | null;
};

/** Pull explicit MPEP section references out of free text (e.g. "MPEP 2111.03"). */
export function extractSectionNumbers(text: string): string[] {
  const matches = text.match(/\b\d{3,4}(?:\.\d+)?(?:\([a-z0-9]+\))?\b/gi) ?? [];
  return [...new Set(matches)].filter((m) => {
    const chapter = Number(m.match(/^\d+/)?.[0] ?? "0");
    return chapter >= 100 && chapter <= 2999;
  });
}

/** Keyword/full-text locate over section title + body. */
export async function locateByKeyword(
  query: string,
  limit = 5,
): Promise<LocatedSection[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mpep_sections")
    .select("section_number, title")
    .textSearch("fts", query, { type: "websearch", config: "english" })
    .limit(limit);
  return (data as LocatedSection[]) ?? [];
}

/** Semantic locate: embed the query and rank sections by chunk cosine similarity. */
export async function locateSemantic(
  query: string,
  limit = 5,
): Promise<LocatedSection[]> {
  let embedding: number[] | null = null;
  try {
    embedding = await embedOne(query, "query");
  } catch {
    return []; // Voyage unavailable/throttled - caller falls back to keyword.
  }
  if (!embedding || embedding.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("match_mpep_chunks", {
    query_embedding: embedding,
    match_count: limit,
  });
  if (error || !data) return [];
  return (data as { section_number: string; title: string | null }[]).map(
    (r) => ({ section_number: r.section_number, title: r.title }),
  );
}

/**
 * Best-effort locate: prefer an explicit, corpus-resolved section number; otherwise
 * semantic search; otherwise keyword search. Returns ranked candidates (first = best).
 */
export async function locate(
  query: string,
  limit = 5,
): Promise<LocatedSection[]> {
  const supabase = await createClient();
  const explicit = extractSectionNumbers(query);
  if (explicit.length > 0) {
    const { data } = await supabase
      .from("mpep_sections")
      .select("section_number, title")
      .in("section_number", explicit);
    if (data && data.length > 0) return data as LocatedSection[];
  }

  const semantic = await locateSemantic(query, limit);
  if (semantic.length > 0) return semantic;
  return locateByKeyword(query, limit);
}
