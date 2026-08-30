/**
 * Pure citation handling for review findings - the display half of the anti-hallucination
 * spine (roadmap §10, §11). Whether a section number exists is a corpus question answered in
 * infrastructure; what to do with the answer is decided here, with no I/O, so it is directly
 * testable: a pin that did not resolve is dropped rather than shown, and the count of dropped
 * pins is reported so the run can be audited.
 */
import type { Finding } from "@/features/review/domain/finding";

export type CitationPartition = { resolved: string[]; dropped: string[] };

/**
 * Split requested citations into the ones backed by real corpus text and the ones that are
 * not. Duplicates collapse; input order is preserved within each bucket.
 */
export function partitionCitations(
  requested: string[],
  valid: ReadonlySet<string>,
): CitationPartition {
  const resolved: string[] = [];
  const dropped: string[] = [];

  for (const citation of new Set(requested)) {
    (valid.has(citation) ? resolved : dropped).push(citation);
  }

  return { resolved, dropped };
}

/**
 * Null out every finding pin that does not resolve against the corpus, and report how many
 * were dropped. The finding itself is kept - its CFR reference and explanation still stand;
 * only the unverifiable MPEP link goes away. Returns new objects, never mutating the input.
 */
export function dropUnresolvedPins<T extends { mpep_section: string | null }>(
  findings: readonly T[],
  valid: ReadonlySet<string>,
): { findings: T[]; dropped: number } {
  let dropped = 0;
  const next = findings.map((finding) => {
    if (finding.mpep_section && !valid.has(finding.mpep_section)) {
      dropped++;
      return { ...finding, mpep_section: null };
    }
    return finding;
  });
  return { findings: next, dropped };
}

/** Every distinct pin carried by a list of findings - the set to validate against the corpus. */
export function collectFindingPins(findings: readonly Finding[]): string[] {
  return findings.map((f) => f.mpep_section).filter((p): p is string => !!p);
}
