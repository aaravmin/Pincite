import "server-only";

/**
 * The page model for the invention-intake step: the disclosure itself plus the
 * cross-reference consistency check against the draft. The check is computed live (it is
 * document-level, not a stored finding), and every MPEP pin it carries is validated against
 * the corpus first - an unresolved pin is dropped rather than shown.
 */
import { resolvePins } from "@/features/mpep/application/validate-citations";
import { getProjectSnapshot } from "@/features/projects/application/get-project-snapshot";
import { runCrossRefChecks } from "@/lib/validators/crossref";
import type { FilingFinding } from "@/lib/validators/filing";
import type { Disclosure } from "@/features/disclosure/domain/types";

export type DisclosurePageModel = {
  disclosure: Disclosure;
  consistency: FilingFinding[];
};

export type GetDisclosurePageDeps = {
  loadSnapshot: typeof getProjectSnapshot;
  runCrossRefChecks: typeof runCrossRefChecks;
  resolvePins: typeof resolvePins;
};

const defaultDeps: GetDisclosurePageDeps = {
  loadSnapshot: getProjectSnapshot,
  runCrossRefChecks,
  resolvePins,
};

export async function getDisclosurePage(
  projectId: string,
  deps: GetDisclosurePageDeps = defaultDeps,
): Promise<DisclosurePageModel | null> {
  const snapshot = await deps.loadSnapshot(projectId);
  if (!snapshot) return null;

  const consistency = await deps.resolvePins(
    deps.runCrossRefChecks(snapshot.disclosure, snapshot.sections),
  );
  return { disclosure: snapshot.disclosure, consistency };
}
