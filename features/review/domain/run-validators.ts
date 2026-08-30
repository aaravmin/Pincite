/**
 * The single entry point for the deterministic validator tiers.
 *
 * Findings used to be assembled by spreading runTier1/2/3 into an array at every call site -
 * the persisting run, the readiness overview, and the dashboard issue count - which is how
 * three screens end up quietly disagreeing about how many issues a matter has. Everything
 * that needs deterministic findings calls this instead, so the tier list and its order live
 * in exactly one place.
 *
 * Pure: no model call, no database, no I/O. Tier order is part of the contract - findings
 * are displayed and persisted in this order.
 */
import type { PatentType } from "@/features/projects/domain/sections";
import type { Finding } from "@/features/review/domain/finding";
import { runTier1 } from "@/features/review/domain/tier1";
import { runTier2 } from "@/features/review/domain/tier2";
import { runTier3 } from "@/features/review/domain/tier3";

export function runDeterministicValidators(
  sections: Record<string, string>,
  patentType: PatentType = "utility",
): Finding[] {
  return [
    ...runTier1(sections, patentType),
    ...runTier2(sections, patentType),
    ...runTier3(sections, patentType),
  ];
}
