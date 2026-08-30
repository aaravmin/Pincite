import "server-only";

/**
 * Locate the responsive MPEP section(s) for a question or finding (roadmap §4.5 "locate").
 * Order of preference: an explicit, corpus-resolved section number; then semantic search
 * over the embedded chunks (Voyage + pgvector); then keyword full-text search as a
 * resilient fallback when embeddings are unavailable or throttled.
 */
import { embedOne } from "@/shared/llm/embeddings";
import type { TypedSupabaseClient } from "@/shared/db/types";
import { extractSectionNumbers } from "@/features/mpep/domain/locate";
import type { LocatedSection } from "@/features/mpep/domain/types";
import {
  findSectionsByNumber,
  matchByEmbedding,
  matchByKeyword,
} from "@/features/mpep/infrastructure/corpus-repository";

async function locateByKeyword(
  supabase: TypedSupabaseClient,
  query: string,
  limit = 5,
): Promise<LocatedSection[]> {
  return matchByKeyword(supabase, query, limit);
}

/** Semantic locate: embed the query and rank sections by chunk cosine similarity. */
async function locateSemantic(
  supabase: TypedSupabaseClient,
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
  return matchByEmbedding(supabase, embedding, limit);
}

/**
 * Best-effort locate: prefer an explicit, corpus-resolved section number; otherwise
 * semantic search; otherwise keyword search. Returns ranked candidates (first = best).
 */
export async function locate(
  supabase: TypedSupabaseClient,
  query: string,
  limit = 5,
): Promise<LocatedSection[]> {
  const explicit = extractSectionNumbers(query);
  if (explicit.length > 0) {
    const found = await findSectionsByNumber(supabase, explicit);
    if (found.length > 0) return found;
  }

  const semantic = await locateSemantic(supabase, query, limit);
  if (semantic.length > 0) return semantic;
  return locateByKeyword(supabase, query, limit);
}
