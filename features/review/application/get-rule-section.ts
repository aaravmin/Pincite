import "server-only";

/**
 * Open the MPEP section a finding is pinned to, for the evidence pane beside the list. The
 * corpus is public reference text rather than user data, so there is nothing to scope here -
 * the caller has already established that someone is signed in.
 */
import { loadSection } from "@/features/mpep/application/load-section";
import type { MpepSection } from "@/features/mpep/domain/types";

export async function getRuleSection(
  sectionNumber: string,
): Promise<MpepSection | null> {
  return loadSection(sectionNumber);
}
