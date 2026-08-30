import "server-only";

/**
 * Auto-detect the standard view (top, front, perspective, ...) of an uploaded image figure
 * with the vision model and store it as the attachment's `view`, so figures get labeled
 * without the user picking from a dropdown. Best-effort: a low-confidence read or a rate
 * limit leaves the view unset rather than guessing. Public/synthetic figures only.
 */
import { logAudit } from "@/shared/audit/log";
import { checkRateLimit } from "@/shared/rate-limit/check";
import type { TypedSupabaseClient } from "@/shared/db/types";
import { acceptDetectedView } from "@/features/drawings/domain/orientation";
import { ATTACHMENT_VIEWS } from "@/features/drawings/domain/types";
import {
  findAttachment,
  updateAttachmentView,
} from "@/features/drawings/infrastructure/attachment-repository";
import { downloadObject } from "@/features/drawings/infrastructure/storage";
import { classifyFigureView } from "@/features/drawings/infrastructure/vision-provider";

export type ClassifyOrientationInput = {
  supabase: TypedSupabaseClient;
  userId: string;
  projectId: string;
  attachmentId: string;
};

export type ClassifyOrientationDeps = {
  findAttachment: typeof findAttachment;
  checkRateLimit: typeof checkRateLimit;
  downloadObject: typeof downloadObject;
  classifyFigureView: typeof classifyFigureView;
  updateAttachmentView: typeof updateAttachmentView;
  logAudit: typeof logAudit;
};

const defaultDeps: ClassifyOrientationDeps = {
  findAttachment,
  checkRateLimit,
  downloadObject,
  classifyFigureView,
  updateAttachmentView,
  logAudit,
};

export async function classifyOrientation(
  input: ClassifyOrientationInput,
  deps: ClassifyOrientationDeps = defaultDeps,
): Promise<{ ok: true; view: string } | { error: string }> {
  const { supabase, projectId, attachmentId } = input;

  const att = await deps.findAttachment(supabase, projectId, attachmentId);
  if (!att) return { error: "Attachment not found." };
  if (!att.mime.startsWith("image/")) {
    return { error: "Only image figures can be classified." };
  }

  const rl = await deps.checkRateLimit(supabase, "drawing_classify", 60, 3600);
  if (!rl.allowed) return { error: rl.retryMessage };

  const file = await deps.downloadObject(att.storage_path);
  if ("error" in file) return { error: file.error ?? "Could not read the file." };

  let result: { view: string; confidence: number };
  try {
    result = await deps.classifyFigureView(file.bytes, att.mime);
  } catch (e) {
    return { error: `Vision model error: ${(e as Error).message}` };
  }

  // Only assign on a confident read; otherwise leave it blank for the user to set.
  const view = acceptDetectedView(result, ATTACHMENT_VIEWS as readonly string[]);
  if (!view) return { ok: true, view: "" };

  await deps.updateAttachmentView(projectId, attachmentId, view);

  await deps.logAudit(supabase, {
    userId: input.userId,
    action: "drawing_oriented",
    projectId,
    detail: { attachmentId, view, confidence: result.confidence },
  });

  return { ok: true, view };
}
