/**
 * Citation validation - the anti-hallucination spine (roadmap §10, §11). Every
 * model-produced MPEP section number is checked against the corpus before display;
 * unresolved cites are dropped and the output flagged for review. Reused by findings,
 * rule surfacing, and the Ask flow.
 */
import { createClient } from "@/lib/supabase/server";

/** Returns the subset of the given section numbers that resolve to real corpus text. */
export async function validateCitations(
  sectionNumbers: string[],
): Promise<Set<string>> {
  const unique = [...new Set(sectionNumbers)];
  if (unique.length === 0) return new Set();
  const supabase = await createClient();
  const { data } = await supabase
    .from("mpep_sections")
    .select("section_number")
    .in("section_number", unique);
  return new Set((data ?? []).map((r) => r.section_number as string));
}

/**
 * Split a model output's cited sections into resolved (real) and dropped (hallucinated
 * or out-of-corpus). Callers display only `resolved` and flag `dropped` for review.
 */
export async function partitionCitations(
  sectionNumbers: string[],
): Promise<{ resolved: string[]; dropped: string[] }> {
  const ok = await validateCitations(sectionNumbers);
  const resolved: string[] = [];
  const dropped: string[] = [];
  for (const n of new Set(sectionNumbers)) {
    (ok.has(n) ? resolved : dropped).push(n);
  }
  return { resolved, dropped };
}
