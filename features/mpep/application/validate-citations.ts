import "server-only";

/**
 * Citation validation - the anti-hallucination spine. Every
 * model-produced MPEP section number is checked against the corpus before display;
 * unresolved cites are dropped and the output flagged for review. Reused by findings,
 * rule surfacing, the lifecycle actions, and the Ask flow.
 *
 * These functions create their own server client on purpose: they are called from server
 * components and actions that have already authenticated, and mpep_sections is a public
 * read-only reference table rather than user-scoped data.
 */
import { createClient } from "@/shared/db/server";
import { findExistingSections } from "@/features/mpep/infrastructure/corpus-repository";
import {
  applyResolvedPins,
  collectPins,
  type Pinned,
} from "@/features/mpep/domain/citations";

/** Returns the subset of the given section numbers that resolve to real corpus text. */
export async function validateCitations(
  sectionNumbers: string[],
): Promise<Set<string>> {
  const unique = [...new Set(sectionNumbers)];
  if (unique.length === 0) return new Set();
  const supabase = await createClient();
  return findExistingSections(supabase, unique);
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

/**
 * The one pin resolver: validate every MPEP pin carried by a list of display items and null
 * out the ones that do not resolve, so nothing reaches the screen citing text that is not
 * in the corpus. Works for findings, surfaced rules, and lifecycle actions alike.
 */
export async function resolvePins<T extends Pinned>(items: T[]): Promise<T[]> {
  const pins = collectPins(items);
  if (pins.length === 0) return items;
  const ok = await validateCitations(pins);
  return applyResolvedPins(items, ok);
}
