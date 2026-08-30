import type { SectionKey } from "@/features/projects/domain/sections";

export type Severity = "violation" | "attention" | "pass";
export type Kind = "structural" | "consistency" | "substantive";

/** A flagged issue, before persistence. span_* are offsets into the section content. */
export type Finding = {
  section_key: SectionKey;
  span_start: number;
  span_end: number;
  severity: Severity;
  kind: Kind;
  /** Actionable = fixable in-app. Informational = a fact (e.g. a USPTO fee) with no input. */
  actionable: boolean;
  title: string;
  explanation: string;
  /** Pinned MPEP section, validated against the corpus before display (null if dropped). */
  mpep_section: string | null;
  /** Display-only statute/regulation reference. */
  cfr_ref: string | null;
};

/** The §101 Alice/Mayo walkthrough (MPEP 2106) - the model's read, framed neutrally. */
export type EligibilityAnalysis = {
  category: string;
  prong_one: string;
  prong_two: string;
  step_2b: string;
  summary: string;
};

/**
 * A persisted finding as it comes back out of the `findings` table: the same shape plus the
 * row id the UI keys on. `section_key` and `kind` widen to string because the read side
 * renders whatever the row says rather than re-validating the enum.
 */
export type FindingRow = {
  id: string;
  section_key: string;
  span_start: number;
  span_end: number;
  severity: Severity;
  kind: string;
  actionable: boolean;
  title: string;
  explanation: string;
  mpep_section: string | null;
  cfr_ref: string | null;
};

/**
 * Process areas, so the user sees WHERE a problem sits rather than a flat wall. Order is
 * the display order.
 */
export const FINDING_AREAS = ["Claims", "Draft"] as const;
export type FindingArea = (typeof FINDING_AREAS)[number];

export function areaOf(finding: { section_key: string }): FindingArea {
  return finding.section_key === "claims" ? "Claims" : "Draft";
}

/** How many findings sit at each severity. Absent severities read 0, not undefined. */
export function countBySeverity(
  findings: readonly { severity: Severity }[],
): Record<Severity, number> {
  const counts: Record<Severity, number> = {
    violation: 0,
    attention: 0,
    pass: 0,
  };
  for (const f of findings) counts[f.severity] += 1;
  return counts;
}

/**
 * The review list, grouped for display: violations first, then attention (passes are not
 * listed), split by process area with empty areas dropped.
 */
export function groupByArea<T extends { severity: Severity; section_key: string }>(
  findings: readonly T[],
): { area: FindingArea; items: T[] }[] {
  const ordered = [
    ...findings.filter((f) => f.severity === "violation"),
    ...findings.filter((f) => f.severity === "attention"),
  ];
  return FINDING_AREAS.map((area) => ({
    area,
    items: ordered.filter((f) => areaOf(f) === area),
  })).filter((group) => group.items.length > 0);
}
