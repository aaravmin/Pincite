import "server-only";

/**
 * The similar-patents screen model: the claim text a search would run against, plus the
 * stored matches with their pinpoint overlaps. `null` means the matter is not visible to
 * the viewer, which the page turns into notFound().
 *
 * The visibility read (the request-cached project snapshot, already loaded by the project
 * layout) and the results read are independent, so they start together.
 */
import { getProjectSnapshot } from "@/features/projects/application/get-project-snapshot";
import { getPriorArtResults } from "@/features/prior-art/application/get-results";
import type { PriorArtResults } from "@/features/prior-art/domain/types";

export async function getPriorArtPage(
  projectId: string,
): Promise<PriorArtResults | null> {
  const [snapshot, results] = await Promise.all([
    getProjectSnapshot(projectId),
    getPriorArtResults(projectId),
  ]);
  if (!snapshot) return null;
  return results;
}
