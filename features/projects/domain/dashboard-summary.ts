/**
 * The derived state behind one dashboard row. The dashboard loader used to do this inline,
 * which meant a database query module imported the validators and the stage engine; now it
 * loads rows and this pure function decides what they mean.
 *
 * The issue count comes from the same deterministic validators the Review screen runs, so
 * the number on the dashboard is the number the user finds when they open the matter.
 *
 * PURE: plain data in, a summary out. No database, no framework.
 */
import {
  filingCompleteness,
  type SectionKey,
} from "@/features/projects/domain/sections";
import type { Project } from "@/features/projects/domain/types";
import { detectStage } from "@/features/projects/domain/stage";
import {
  dashboardNextStep,
  type NextStep,
} from "@/features/projects/domain/next-step";
import { REQUIRED_SECTION_KEYS } from "@/features/projects/domain/step-progress";
import { runDeterministicValidators } from "@/features/review/domain/run-validators";

/** The batched raw data the dashboard repository loads for one project. */
export type DashboardRow = {
  project: Project;
  /** section_key -> stored word count (drives the depth-weighted completeness). */
  sectionWords: Partial<Record<SectionKey, number>>;
  /** section_key -> content (drives the live validator issue count). */
  sectionContent: Record<string, string>;
  versionCount: number;
  hasDisclosure: boolean;
  inventorCount: number;
  hasSignedDeclaration: boolean;
};

export type DashboardProject = Project & {
  completeness: number;
  versionCount: number;
  stage: string;
  /** Live count of open violations from the deterministic validators (the Review issues). */
  openIssues: number;
  /** The next action, reflecting real progress (not just the declared status). */
  next: NextStep;
};

export function summarizeDashboardProject(row: DashboardRow): DashboardProject {
  const { project } = row;
  const openIssues = runDeterministicValidators(
    row.sectionContent,
    project.patent_type,
  ).filter((f) => f.severity === "violation").length;
  // A section counts as written once it has words; the advanced sections are stage-specific
  // and never required for a complete draft.
  const filled = REQUIRED_SECTION_KEYS.filter(
    (k) => (row.sectionWords[k] ?? 0) > 0,
  );

  return {
    ...project,
    completeness: filingCompleteness({
      sectionWords: row.sectionWords,
      hasDisclosure: row.hasDisclosure,
      inventorCount: row.inventorCount,
      hasSignedDeclaration: row.hasSignedDeclaration,
    }),
    versionCount: row.versionCount,
    openIssues,
    next: dashboardNextStep({
      status: project.declared_status,
      draftComplete: filled.length === REQUIRED_SECTION_KEYS.length,
      inventorCount: row.inventorCount,
      openIssues,
      hasSignedDeclaration: row.hasSignedDeclaration,
    }),
    stage: detectStage({
      filled,
      declared_status: project.declared_status,
      application_number: project.application_number,
      filing_date: project.filing_date,
      patent_type: project.patent_type,
    }).label,
  };
}
