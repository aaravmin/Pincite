/**
 * Split across two features' repositories, which now take the caller's request-scoped client
 * instead of creating their own:
 *   getInventors  -> features/filing/infrastructure/inventors-repository:listInventors
 *   getAttachments -> features/drawings/infrastructure/attachment-repository:listAttachments
 * Shim kept for importers not yet remapped; RLS still scopes every query to the owner.
 */
import { createClient } from "@/shared/db/server";
import { listInventors } from "@/features/filing/infrastructure/inventors-repository";
import { listAttachments } from "@/features/drawings/infrastructure/attachment-repository";
import type { Inventor } from "@/features/filing/domain/types";
import type { Attachment } from "@/features/drawings/domain/types";

export async function getInventors(projectId: string): Promise<Inventor[]> {
  return listInventors(await createClient(), projectId);
}

export async function getAttachments(projectId: string): Promise<Attachment[]> {
  return listAttachments(await createClient(), projectId);
}
