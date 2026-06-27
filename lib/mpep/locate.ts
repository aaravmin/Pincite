/**
 * Locate the responsive MPEP section(s) for a question or finding (roadmap §4.5 "locate"
 * step). Two signals available now: an explicit section-number reference, and keyword
 * full-text search over the corpus (the `fts` tsvector). Semantic (pgvector) locate is
 * added once the embedding pass has run — see scripts/embed-mpep.mjs.
 */
import { createClient } from "@/lib/supabase/server";

export type LocatedSection = {
  section_number: string;
  title: string | null;
};

/** Pull explicit MPEP section references out of free text (e.g. "MPEP 2111.03"). */
export function extractSectionNumbers(text: string): string[] {
  const matches = text.match(/\b\d{3,4}(?:\.\d+)?(?:\([a-z0-9]+\))?\b/gi) ?? [];
  // Keep things that look like MPEP sections (chapter 100-2900), drop bare years etc.
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

/**
 * Best-effort locate: prefer an explicit, corpus-resolved section number in the query;
 * otherwise fall back to keyword search. Returns ranked candidates (first = best).
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
  return locateByKeyword(query, limit);
}
