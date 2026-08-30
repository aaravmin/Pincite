import "server-only";

/**
 * The page model for the Sign step. Role decides what has to be collected: an attorney files
 * the power of attorney and collects each inventor's declaration but never signs the
 * inventor's oath (37 CFR 1.32 / 1.63), while a pro-se inventor signs their own.
 *
 * "Signed" means a declaration-kind attachment exists - the operative signature is the one
 * the inventor places on the downloaded document by hand. Pincite never verifies it.
 */
import { requireViewer } from "@/shared/auth/require-viewer";
import { getProjectSnapshot } from "@/features/projects/application/get-project-snapshot";
import type { Project } from "@/lib/projects/types";
import type { Inventor } from "@/features/filing/domain/types";
import {
  isDeclaration,
  type Attachment,
} from "@/features/drawings/domain/types";

export type SignPageModel = {
  project: Project;
  inventors: Inventor[];
  declarationDocs: Attachment[];
  isAttorney: boolean;
  hrefs: { declaration: string; poa: string };
};

export type GetSignPageDeps = {
  loadSnapshot: typeof getProjectSnapshot;
  requireViewer: typeof requireViewer;
};

const defaultDeps: GetSignPageDeps = {
  loadSnapshot: getProjectSnapshot,
  requireViewer,
};

export async function getSignPage(
  projectId: string,
  deps: GetSignPageDeps = defaultDeps,
): Promise<SignPageModel | null> {
  const { profile } = await deps.requireViewer();
  const snapshot = await deps.loadSnapshot(projectId);
  if (!snapshot) return null;

  return {
    project: snapshot.project,
    inventors: snapshot.inventors,
    declarationDocs: snapshot.attachments.filter(isDeclaration),
    isAttorney: profile.role === "attorney",
    hrefs: {
      declaration: `/api/projects/${projectId}/declaration`,
      poa: `/api/projects/${projectId}/declaration?doc=poa`,
    },
  };
}
