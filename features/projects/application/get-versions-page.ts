import "server-only";

/**
 * The version-history model: the matter plus every immutable save, newest first. Saves are
 * append-only (roadmap §8) - reopening an earlier save appends a new version linked to its
 * source and never deletes later history.
 */
import { requireViewer } from "@/shared/auth/require-viewer";
import { getProjectSnapshot } from "@/features/projects/application/get-project-snapshot";
import { listVersions } from "@/features/projects/infrastructure/project-repository";
import type { Project, ProjectVersion } from "@/features/projects/domain/types";

export type VersionsPageModel = {
  project: Project;
  versions: ProjectVersion[];
};

export async function getVersionsPage(
  projectId: string,
): Promise<VersionsPageModel | null> {
  const snapshot = await getProjectSnapshot(projectId);
  if (!snapshot) return null;
  const { supabase } = await requireViewer();
  return {
    project: snapshot.project,
    versions: await listVersions(supabase, projectId),
  };
}
