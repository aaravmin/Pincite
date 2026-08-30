import "server-only";

/** Manually set (or clear) a figure's view, to correct an auto-detected label. */
import { logAudit } from "@/shared/audit/log";
import type { TypedSupabaseClient } from "@/shared/db/types";
import { ATTACHMENT_VIEWS } from "@/features/drawings/domain/types";
import {
  findAttachment,
  updateAttachmentView,
} from "@/features/drawings/infrastructure/attachment-repository";

export type UpdateDrawingViewInput = {
  supabase: TypedSupabaseClient;
  userId: string;
  projectId: string;
  attachmentId: string;
  view: string;
};

export type UpdateDrawingViewDeps = {
  findAttachment: typeof findAttachment;
  updateAttachmentView: typeof updateAttachmentView;
  logAudit: typeof logAudit;
};

const defaultDeps: UpdateDrawingViewDeps = {
  findAttachment,
  updateAttachmentView,
  logAudit,
};

export async function updateDrawingView(
  input: UpdateDrawingViewInput,
  deps: UpdateDrawingViewDeps = defaultDeps,
): Promise<{ ok: true } | { error: string }> {
  const { supabase, projectId, attachmentId } = input;
  const view = (ATTACHMENT_VIEWS as readonly string[]).includes(input.view)
    ? input.view
    : "";

  const att = await deps.findAttachment(supabase, projectId, attachmentId);
  if (!att) return { error: "Attachment not found." };

  await deps.updateAttachmentView(projectId, attachmentId, view || null);

  await deps.logAudit(supabase, {
    userId: input.userId,
    action: "drawing_oriented",
    projectId,
    detail: { attachmentId, view, manual: true },
  });

  return { ok: true };
}
