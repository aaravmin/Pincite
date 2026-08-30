import "server-only";

/**
 * The only place that touches the MPEP corpus tables. Every function takes the Supabase
 * client as its first parameter so application code can hand it a fake in tests and so one
 * request reuses one client. The corpus is a read-only public reference table, not
 * user-scoped data.
 */
import type { TypedSupabaseClient } from "@/shared/db/types";
import type {
  LocatedSection,
  MpepSection,
} from "@/features/mpep/domain/types";

const COLUMNS =
  "section_number, title, chapter, revision_tag, edition, source_url, full_text";

/** Load a full section (the evidence pane highlights offsets into full_text). */
export async function loadSectionRow(
  supabase: TypedSupabaseClient,
  sectionNumber: string,
): Promise<MpepSection | null> {
  const { data } = await supabase
    .from("mpep_sections")
    .select(COLUMNS)
    .eq("section_number", sectionNumber)
    .maybeSingle();
  if (!data) return null;
  return {
    section_number: data.section_number,
    title: data.title,
    chapter: data.chapter,
    revision_tag: data.revision_tag,
    edition: data.edition,
    source_url: data.source_url,
    full_text: data.full_text,
  };
}

/** The subset of the given section numbers that resolve to real corpus text. */
export async function findExistingSections(
  supabase: TypedSupabaseClient,
  sectionNumbers: string[],
): Promise<Set<string>> {
  const unique = [...new Set(sectionNumbers)];
  if (unique.length === 0) return new Set();
  const { data } = await supabase
    .from("mpep_sections")
    .select("section_number")
    .in("section_number", unique);
  return new Set((data ?? []).map((r) => r.section_number));
}

/** Section number + title for an explicit, already-extracted list of numbers. */
export async function findSectionsByNumber(
  supabase: TypedSupabaseClient,
  sectionNumbers: string[],
): Promise<LocatedSection[]> {
  if (sectionNumbers.length === 0) return [];
  const { data } = await supabase
    .from("mpep_sections")
    .select("section_number, title")
    .in("section_number", sectionNumbers);
  return (data ?? []).map((r) => ({
    section_number: r.section_number,
    title: r.title,
  }));
}

/**
 * Keyword/full-text locate over section title + body, ranked by ts_rank (best first).
 * Goes through the match_mpep_keyword RPC because the query builder's .textSearch() can't
 * order by the computed rank, so it would otherwise return matches in physical table order
 * (which surfaced broad catch-all sections like 101/103 for nearly every question).
 */
export async function matchByKeyword(
  supabase: TypedSupabaseClient,
  query: string,
  limit: number,
): Promise<LocatedSection[]> {
  const { data } = await supabase.rpc("match_mpep_keyword", {
    search_query: query,
    match_count: limit,
  });
  return (data ?? []).map((r) => ({
    section_number: r.section_number,
    title: r.title,
  }));
}

/** Rank sections by chunk cosine similarity against an already-computed query embedding. */
export async function matchByEmbedding(
  supabase: TypedSupabaseClient,
  embedding: number[],
  limit: number,
): Promise<LocatedSection[]> {
  const { data, error } = await supabase.rpc("match_mpep_chunks", {
    // Generated types model a pgvector argument as text; PostgREST accepts the raw
    // number array and casts it, which is what this call has always sent.
    query_embedding: embedding as unknown as string,
    match_count: limit,
  });
  if (error || !data) return [];
  return data.map((r) => ({
    section_number: r.section_number,
    title: r.title,
  }));
}
