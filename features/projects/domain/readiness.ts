/**
 * Per-matter readiness: one assembled picture of where an application stands and what to do
 * next. It is deliberately assembled from the SAME building blocks the individual screens
 * use - stage detection, the deterministic validators, the filing and cross-reference
 * checks, the completeness score - so the overview can never disagree with the detail
 * screens.
 *
 * PURE: every input (the findings, the filing checks, the prior-art count, whether an export
 * exists) is computed by the caller; this module only decides what that means. No database,
 * no framework, so the gate ordering and the next-step choice are unit-testable.
 */
import {
  SECTION_KEYS,
  filingCompleteness,
  wordCount,
  type SectionKey,
} from "@/features/projects/domain/sections";
import type { Project } from "@/features/projects/domain/types";
import { detectStage } from "@/features/projects/domain/stage";
import { lifecycleActions } from "@/features/projects/domain/lifecycle";
import {
  REQUIRED_SECTION_KEYS,
  drawingCount as countDrawings,
  hasSignedDeclaration as someSignedDeclaration,
  stepProgress,
} from "@/features/projects/domain/step-progress";
import type { Finding } from "@/features/review/domain/finding";
import type { FilingFinding } from "@/features/review/domain/filing-checks";
import type { AttachmentKind } from "@/features/drawings/domain/types";
import type { Disclosure } from "@/features/disclosure/domain/types";

export type GateStatus = "done" | "violation" | "attention" | "todo";
export type Gate = {
  key: string;
  label: string;
  status: GateStatus;
  detail: string;
  href: string;
};
export type ReadinessMetrics = {
  /** total red findings across the substantive validators + the filing tier */
  redIssues: number;
  /** substantive violations only (tiers 1-3) */
  toFix: number;
  /** attention findings (tiers 1-3) */
  toCheck: number;
  /** filing-readiness violations */
  filingFix: number;
  /** disclosure/draft cross-reference items to reconcile */
  consistency: number;
  /** similar public patents found */
  priorArt: number;
  /** figures uploaded */
  drawings: number;
};
export type OverviewFinding = {
  id: string;
  area: "Claims" | "Specification" | "Filing";
  severity: "violation" | "attention" | "pass";
  title: string;
  explanation: string;
  mpep_section: string | null;
  cfr_ref: string | null;
  /** deep link that opens the issue in context */
  href: string;
};
export type Readiness = {
  project: Project;
  stage: { label: string; signals: string[]; missing: string[] };
  completeness: number;
  gates: Gate[];
  next: { label: string; href: string } | null;
  metrics: ReadinessMetrics;
  /** the nearest deadline-bound action for the declared status, if any */
  nextDeadline: { label: string; detail: string } | null;
  /** the live findings behind the counts, for the overview triage table */
  findings: OverviewFinding[];
};

/** Only the inventor fields readiness reads. */
type InventorFields = {
  legal_name: string;
  residence: string;
  mailing_address: string;
};

export type ReadinessInput = {
  project: Project;
  sections: Partial<Record<SectionKey, string>>;
  inventors: readonly InventorFields[];
  attachments: readonly { kind: AttachmentKind }[];
  disclosure: Partial<Disclosure>;
  /** whether this matter has produced at least one export */
  hasExport: boolean;
  /** similar public patents already found for this matter */
  priorArtCount: number;
  /** the deterministic tier 1-3 findings */
  findings: readonly Finding[];
  /** the filing-readiness checks */
  filing: readonly FilingFinding[];
  /** the disclosure/draft cross-reference items */
  consistency: readonly FilingFinding[];
};

export function computeReadiness(input: ReadinessInput): Readiness {
  const { project, sections, inventors, attachments, disclosure } = input;
  const base = `/projects/${project.id}`;
  const pt = project.patent_type;

  const hasSignedDeclaration = someSignedDeclaration(attachments);
  const drawings = countDrawings(attachments);

  // Stage and completeness.
  const filledKeys = REQUIRED_SECTION_KEYS.filter(
    (k) => (sections[k] ?? "").trim().length > 0,
  );
  const stage = detectStage({
    filled: filledKeys,
    declared_status: project.declared_status,
    application_number: project.application_number,
    filing_date: project.filing_date,
    patent_type: pt,
  });
  const sectionWords: Partial<Record<SectionKey, number>> = {};
  for (const k of SECTION_KEYS) sectionWords[k] = wordCount(sections[k] ?? "");
  const hasDisclosure = !!(
    disclosure.problem_solved?.trim() || disclosure.how_it_works?.trim()
  );
  const completeness = filingCompleteness({
    sectionWords,
    hasDisclosure,
    inventorCount: inventors.length,
    hasSignedDeclaration,
  });

  const toFix = input.findings.filter((f) => f.severity === "violation").length;
  const toCheck = input.findings.filter((f) => f.severity === "attention").length;
  const filingFix = input.filing.filter((f) => f.severity === "violation").length;
  const consistency = input.consistency.length;

  // The live findings behind the counts, shaped for the overview triage table.
  // Same source as the counts, so the table never disagrees with the KPIs.
  const overviewFindings: OverviewFinding[] = [
    ...input.findings.map((f, i) => ({
      id: `s${i}-${f.kind}-${f.span_start}`,
      area: (f.section_key === "claims" ? "Claims" : "Specification") as OverviewFinding["area"],
      severity: f.severity,
      title: f.title,
      explanation: f.explanation,
      mpep_section: f.mpep_section,
      cfr_ref: f.cfr_ref,
      href: `${base}?section=${f.section_key}&from=${f.span_start}&to=${f.span_end}`,
    })),
    ...input.filing.map((f, i) => ({
      id: `f${i}-${f.severity}`,
      area: "Filing" as const,
      severity: f.severity,
      title: f.title,
      explanation: f.explanation,
      mpep_section: f.mpep_section,
      cfr_ref: f.cfr_ref,
      href: `${base}/sign`,
    })),
  ];

  // Per-step completion, the same flags the step rail ticks.
  const steps = stepProgress({
    sections,
    inventors,
    attachments,
    disclosure,
    hasExport: input.hasExport,
  });

  const g = (
    key: string,
    label: string,
    status: GateStatus,
    detail: string,
    href: string,
  ): Gate => ({ key, label, status, detail, href });

  const gates: Gate[] = [
    g(
      "draft",
      "Draft",
      steps.draft ? "done" : "todo",
      steps.draft ? "All required sections written" : `${completeness}% written`,
      base,
    ),
    g(
      "disclosure",
      "Invention disclosure",
      steps.disclosure ? "done" : "todo",
      steps.disclosure ? "Complete" : "Add the plain-language intake",
      `${base}/disclosure`,
    ),
    g(
      "inventors",
      "Inventors and applicant",
      steps.inventors ? "done" : "todo",
      steps.inventors
        ? `${inventors.length} inventor${inventors.length === 1 ? "" : "s"} on the ADS`
        : "Add the inventors and the applicant",
      `${base}/inventors`,
    ),
    g(
      "drawings",
      "Drawings",
      drawings > 0 ? "done" : "todo",
      drawings > 0 ? `${drawings} uploaded` : "Upload your figures",
      `${base}/uploads`,
    ),
    g(
      "issues",
      "Issues",
      toFix > 0 ? "violation" : toCheck > 0 ? "attention" : "done",
      toFix > 0
        ? `${toFix} to fix${toCheck ? `, ${toCheck} to check` : ""}`
        : toCheck > 0
          ? `${toCheck} to check`
          : "No issues found",
      `${base}/review`,
    ),
    g(
      "filing",
      "Filing readiness",
      filingFix > 0 ? "violation" : "done",
      filingFix > 0 ? `${filingFix} to fix before filing` : "No filing defects",
      `${base}/sign`,
    ),
    g(
      "priorart",
      "Prior art",
      input.priorArtCount > 0 ? "done" : "todo",
      input.priorArtCount > 0
        ? `${input.priorArtCount} similar patents found`
        : "Run a search",
      `${base}/prior-art`,
    ),
    g(
      "sign",
      "Inventor declarations",
      steps.sign ? "done" : "todo",
      steps.sign
        ? "Signed declaration uploaded"
        : "Download, sign, and upload the declaration",
      `${base}/sign`,
    ),
    g(
      "export",
      "Export",
      steps.submission ? "done" : "todo",
      steps.submission ? "Filing package exported" : "Export the filing package",
      `${base}/report`,
    ),
  ];

  if (hasDisclosure) {
    gates.splice(
      5,
      0,
      g(
        "consistency",
        "Consistency with the draft",
        consistency > 0 ? "attention" : "done",
        consistency > 0 ? `${consistency} to reconcile` : "Disclosure lines up",
        `${base}/disclosure`,
      ),
    );
  }

  // Next step: the first gate that needs action, violations first, then anything unfinished.
  const next =
    gates.find((x) => x.status === "violation") ??
    gates.find((x) => x.status === "todo") ??
    gates.find((x) => x.status === "attention") ??
    null;

  // The nearest deadline-bound action for a post-filing matter (CFR + corpus
  // validated in lifecycleActions). Drafting matters have no deadline yet.
  const deadlineAction = lifecycleActions(project.declared_status, pt).find(
    (a) => a.deadline,
  );
  const nextDeadline = deadlineAction
    ? { label: deadlineAction.deadline as string, detail: deadlineAction.title }
    : null;

  return {
    project,
    stage,
    completeness,
    gates,
    next: next ? { label: next.label, href: next.href } : null,
    metrics: {
      redIssues: toFix + filingFix,
      toFix,
      toCheck,
      filingFix,
      consistency,
      priorArt: input.priorArtCount,
      drawings,
    },
    nextDeadline,
    findings: overviewFindings,
  };
}
