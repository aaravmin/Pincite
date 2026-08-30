import "server-only";

/**
 * Remove one uploaded file from a matter. Ownership is confirmed with the USER client first
 * (RLS returns no row for someone else's matter); only then does the Storage work run with
 * the admin client.
 */
import { logAudit } from "@/shared/audit/log";
import type { TypedSupabaseClient } from "@/shared/db/types";
import {
  countStoragePathSiblings,
  deleteAttachmentRow,
  findAttachment,
} from "@/features/drawings/infrastructure/attachment-repository";
import { removeObjects } from "@/features/drawings/infrastructure/storage";

export type DeleteAttachmentInput = {
  supabase: TypedSupabaseClient;
  userId: string;
  projectId: string;
  attachmentId: string;
};

export type DeleteAttachmentDeps = {
  findAttachment: typeof findAttachment;
  countStoragePathSiblings: typeof countStoragePathSiblings;
  removeObjects: typeof removeObjects;
  deleteAttachmentRow: typeof deleteAttachmentRow;
  logAudit: typeof logAudit;
};

const defaultDeps: DeleteAttachmentDeps = {
  findAttachment,
  countStoragePathSiblings,
  removeObjects,
  deleteAttachmentRow,
  logAudit,
};

export async function deleteAttachment(
  input: DeleteAttachmentInput,
  deps: DeleteAttachmentDeps = defaultDeps,
): Promise<{ ok: true } | { error: string }> {
  const { supabase, projectId, attachmentId } = input;

  const row = await deps.findAttachment(supabase, projectId, attachmentId);
  if (!row) return { error: "Attachment not found." };

  // The per-page rows of a multi-page PDF share one storage object; only remove the bytes
  // when this is the last row referencing them, so deleting one page doesn't wipe the others.
  const siblings = await deps.countStoragePathSiblings(
    supabase,
    projectId,
    row.storage_path,
    attachmentId,
  );
  if (siblings === 0) await deps.removeObjects([row.storage_path]);

  const error = await deps.deleteAttachmentRow(supabase, attachmentId);
  if (error) return { error };

  await deps.logAudit(supabase, {
    userId: input.userId,
    action: "attachment_deleted",
    projectId,
  });
  return { ok: true };
}
