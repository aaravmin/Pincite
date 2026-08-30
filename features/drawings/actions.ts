"use server";

/**
 * Drawing mutations. Attachment UPLOADS go through the route handler
 * app/api/projects/[id]/attachments (multipart), not a server action.
 *
 * Each action authenticates, hands the request-scoped client to one application operation,
 * and revalidates. Ownership, rate limits, Storage, and the vision provider all live below
 * this line.
 */
import { revalidatePath } from "next/cache";
import { requireViewer } from "@/shared/auth/require-viewer";
import { analyzeDrawing as analyzeDrawingOp } from "@/features/drawings/application/analyze-drawing";
import { classifyOrientation as classifyOrientationOp } from "@/features/drawings/application/classify-orientation";
import { deleteAttachment as deleteAttachmentOp } from "@/features/drawings/application/delete-attachment";
import { updateDrawingView } from "@/features/drawings/application/update-drawing-view";
import type { DrawingReview } from "@/features/drawings/domain/types";

export async function deleteAttachment(input: {
  projectId: string;
  attachmentId: string;
}): Promise<{ ok: true } | { error: string }> {
  const { supabase, user } = await requireViewer();
  const result = await deleteAttachmentOp({
    supabase,
    userId: user.id,
    projectId: input.projectId,
    attachmentId: input.attachmentId,
  });
  if ("error" in result) return result;
  revalidatePath(`/projects/${input.projectId}/uploads`);
  return result;
}

export async function analyzeDrawing(input: {
  projectId: string;
  attachmentId: string;
}): Promise<({ ok: true } & DrawingReview) | { error: string }> {
  const { supabase, user } = await requireViewer();
  return analyzeDrawingOp({
    supabase,
    userId: user.id,
    projectId: input.projectId,
    attachmentId: input.attachmentId,
  });
}

export async function classifyOrientation(input: {
  projectId: string;
  attachmentId: string;
}): Promise<{ ok: true; view: string } | { error: string }> {
  const { supabase, user } = await requireViewer();
  return classifyOrientationOp({
    supabase,
    userId: user.id,
    projectId: input.projectId,
    attachmentId: input.attachmentId,
  });
}

export async function setAttachmentView(input: {
  projectId: string;
  attachmentId: string;
  view: string;
}): Promise<{ ok: true } | { error: string }> {
  const { supabase, user } = await requireViewer();
  return updateDrawingView({
    supabase,
    userId: user.id,
    projectId: input.projectId,
    attachmentId: input.attachmentId,
    view: input.view,
  });
}
