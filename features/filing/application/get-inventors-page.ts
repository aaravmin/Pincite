import "server-only";

/** The page model for the Inventors & applicant step: the ADS data card and its gaps. */
import { getProjectSnapshot } from "@/features/projects/application/get-project-snapshot";
import type { Project } from "@/lib/projects/types";
import { buildAds, type AdsCard } from "@/features/filing/domain/ads";
import type { Inventor } from "@/features/filing/domain/types";

export type InventorsPageModel = {
  project: Project;
  inventors: Inventor[];
  ads: AdsCard;
};

export type GetInventorsPageDeps = { loadSnapshot: typeof getProjectSnapshot };

const defaultDeps: GetInventorsPageDeps = { loadSnapshot: getProjectSnapshot };

export async function getInventorsPage(
  projectId: string,
  deps: GetInventorsPageDeps = defaultDeps,
): Promise<InventorsPageModel | null> {
  const snapshot = await deps.loadSnapshot(projectId);
  if (!snapshot) return null;

  return {
    project: snapshot.project,
    inventors: snapshot.inventors,
    ads: buildAds(
      snapshot.project,
      snapshot.inventors,
      snapshot.sections["title"] ?? "",
    ),
  };
}
