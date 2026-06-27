import type { SectionKey } from "@/lib/projects/sections";

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
