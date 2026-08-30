/**
 * Moved to features/disclosure/infrastructure/disclosure-repository:loadDisclosure, which
 * takes the caller's request-scoped client. Shim kept for importers not yet remapped.
 */
import { createClient } from "@/shared/db/server";
import { loadDisclosure } from "@/features/disclosure/infrastructure/disclosure-repository";
import type { Disclosure } from "@/features/disclosure/domain/types";

export async function getDisclosure(projectId: string): Promise<Disclosure> {
  return loadDisclosure(await createClient(), projectId);
}
