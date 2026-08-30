import "server-only";

/**
 * Assemble the review report (roadmap §9): project metadata + detected stage, the draft
 * sections, findings grouped by severity with pins, the applies-now/conditional rules, and
 * the prior-art matches with overlaps. `toText` serializes it for the TXT export and the
 * /report screen renders the same object for print-to-PDF, so both always agree.
 *
 * The three reads - the project snapshot, the stored findings, and the prior-art matches -
 * do not depend on each other, so they run together.
 */
import { getProjectSnapshot } from "@/features/projects/application/get-project-snapshot";
import { getPriorArtResults } from "@/features/prior-art/application/get-results";
import { getReview } from "@/lib/validators/results";
import type { FindingRow } from "@/features/review/domain/finding";
import { detectStage } from "@/features/projects/domain/stage";
import { surfaceRules } from "@/features/rules/domain/surface";
import {
  SECTION_KEYS,
  SECTION_LABELS,
} from "@/lib/projects/sections";
import type { Report } from "@/features/exports/formats/txt";

export type GetReportDeps = {
  loadSnapshot: typeof getProjectSnapshot;
  /**
   * Only the findings are used. Typed structurally rather than as `typeof getReview` so the
   * compatibility loader in lib/validators (which also re-reads the sections this module now
   * takes from the snapshot) can be swapped for a findings-only reader without a type change.
   */
  loadFindings: (projectId: string) => Promise<{ findings: FindingRow[] }>;
  loadPriorArt: typeof getPriorArtResults;
};

const defaultDeps: GetReportDeps = {
  loadSnapshot: getProjectSnapshot,
  loadFindings: getReview,
  loadPriorArt: getPriorArtResults,
};

export async function buildReportData(
  projectId: string,
  deps: GetReportDeps = defaultDeps,
): Promise<Report | null> {
  const [snapshot, review, priorArt] = await Promise.all([
    deps.loadSnapshot(projectId),
    deps.loadFindings(projectId),
    deps.loadPriorArt(projectId),
  ]);
  if (!snapshot) return null;

  const { project, sections: map } = snapshot;
  const filled = Object.entries(map)
    .filter(([, v]) => v.trim().length > 0)
    .map(([k]) => k);
  const stage = detectStage({
    filled,
    declared_status: project.declared_status,
    application_number: project.application_number,
    filing_date: project.filing_date,
    patent_type: project.patent_type,
  }).label;

  const { appliesNow, conditional } = surfaceRules({
    patentType: project.patent_type,
    filled,
    sections: map,
    declared_status: project.declared_status,
  });
  const sections = SECTION_KEYS.map((k) => ({
    key: k,
    label: SECTION_LABELS[k],
    content: map[k] ?? "",
  })).filter((s) => s.content.trim().length > 0);

  return {
    project,
    stage,
    generatedAt: new Date().toISOString(),
    sections,
    findings: review.findings,
    appliesNow,
    conditional,
    priorArt: priorArt.matches,
  };
}
