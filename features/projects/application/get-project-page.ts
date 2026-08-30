import "server-only";

/**
 * The draft workspace model: the project and its section text. It reads the request-cached
 * snapshot, which the surrounding project layout has already loaded, so opening the draft
 * costs no extra queries.
 */
import { getProjectSnapshot } from "@/features/projects/application/get-project-snapshot";
import type { SectionKey } from "@/features/projects/domain/sections";
import type { Project } from "@/features/projects/domain/types";

export type ProjectPageModel = {
  project: Project;
  sections: Record<SectionKey, string>;
};

export async function getProjectPage(
  projectId: string,
): Promise<ProjectPageModel | null> {
  const snapshot = await getProjectSnapshot(projectId);
  if (!snapshot) return null;
  return { project: snapshot.project, sections: snapshot.sections };
}
