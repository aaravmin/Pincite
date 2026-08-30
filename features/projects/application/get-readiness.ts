import "server-only";

/**
 * The readiness model for one matter. It runs the SAME deterministic checks the detail
 * screens run - the validator tiers, the filing-readiness tier, the disclosure
 * cross-reference checks - over the request-cached project snapshot, then hands them to the
 * pure `computeReadiness` to decide what they mean. That is why the overview can never
 * report a different issue count from Review.
 *
 * Every MPEP pin is validated against the corpus before it reaches the screen; unresolved
 * pins are dropped, and the CFR reference still shows. The validator findings and the filing
 * checks are validated in ONE round trip - the two steps `resolvePins` performs, split so a
 * section cited by both lists is not looked up twice.
 */
import { requireViewer } from "@/shared/auth/require-viewer";
import { validateCitations } from "@/features/mpep/application/validate-citations";
import {
  applyResolvedPins,
  collectPins,
} from "@/features/mpep/domain/citations";
import { getProjectSnapshot } from "@/features/projects/application/get-project-snapshot";
import { countPriorArtMatches } from "@/features/projects/infrastructure/project-repository";
import {
  computeReadiness,
  type Readiness,
} from "@/features/projects/domain/readiness";
import { hasSignedDeclaration } from "@/features/drawings/domain/types";
import { runDeterministicValidators } from "@/features/review/domain/run-validators";
import { runFilingChecks } from "@/features/review/domain/filing-checks";
import { runCrossRefChecks } from "@/features/review/domain/cross-reference";
import type { UserRole } from "@/shared/auth/types";

export type GetReadinessDeps = {
  requireViewer: typeof requireViewer;
  getProjectSnapshot: typeof getProjectSnapshot;
  countPriorArtMatches: typeof countPriorArtMatches;
  validateCitations: typeof validateCitations;
};

const defaultDeps: GetReadinessDeps = {
  requireViewer,
  getProjectSnapshot,
  countPriorArtMatches,
  validateCitations,
};

export async function getReadiness(
  projectId: string,
  role: UserRole | null,
  deps: GetReadinessDeps = defaultDeps,
): Promise<Readiness | null> {
  const snapshot = await deps.getProjectSnapshot(projectId);
  if (!snapshot) return null;
  const { project, sections, inventors, attachments, disclosure, exports } =
    snapshot;

  // Live deterministic checks, so the counts are current without a prior manual run.
  const findings = runDeterministicValidators(sections, project.patent_type);
  const filing = runFilingChecks({
    project,
    inventors,
    hasSignedDeclaration: hasSignedDeclaration(attachments),
    role,
    title: sections.title,
  });
  const consistency = runCrossRefChecks(disclosure, sections);

  // requireViewer is request-cached, so this reuses the client the snapshot already used.
  const { supabase } = await deps.requireViewer();
  const [priorArtCount, resolved] = await Promise.all([
    deps.countPriorArtMatches(supabase, projectId),
    deps.validateCitations(collectPins([...findings, ...filing])),
  ]);

  return computeReadiness({
    project,
    sections,
    inventors,
    attachments,
    disclosure,
    hasExport: exports.length > 0,
    priorArtCount,
    findings: applyResolvedPins(findings, resolved),
    filing: applyResolvedPins(filing, resolved),
    consistency,
  });
}
