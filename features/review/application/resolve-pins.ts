import "server-only";

/**
 * Validate the MPEP pins carried by the document-level checks (filing readiness and the
 * cross-reference consistency list) against the corpus, dropping any that do not resolve.
 * The finding still shows - its CFR reference and explanation stand on their own - but a
 * citation never reaches the screen without real text behind it.
 *
 * Both check families use the same FilingFinding shape, so they share one resolver; the
 * generic pin logic itself lives in the MPEP feature.
 */
import { resolvePins } from "@/features/mpep/application/validate-citations";
import type { FilingFinding } from "@/features/review/domain/filing-checks";

export async function resolveFilingPins(
  findings: FilingFinding[],
): Promise<FilingFinding[]> {
  return resolvePins(findings);
}

/** Same resolver, kept under the cross-reference name its callers use. */
export { resolveFilingPins as resolveCrossRefPins };
