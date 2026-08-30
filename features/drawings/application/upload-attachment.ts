import "server-only";

/**
 * Upload a drawing or supporting document into the private US-region Storage bucket under
 * `{projectId}/...`.
 *
 * ORDER MATTERS. The file is validated and the target project confirmed with the USER
 * client BEFORE any Storage work, so an unauthorized or malformed request never reaches the
 * bucket. The Storage write itself uses the admin client (the SSR client does not carry the
 * JWT to Storage); the object key is namespaced by project id. If the row insert then fails,
 * the uploaded object is removed again so no orphan bytes are left behind.
 */
import { logAudit } from "@/shared/audit/log";
import type { TablesInsert, TypedSupabaseClient } from "@/shared/db/types";
import type { Attachment } from "@/features/drawings/domain/types";
import {
  coerceAttachmentKind,
  coerceAttachmentView,
  safeUploadName,
  validateUpload,
} from "@/features/drawings/domain/upload-policy";
import {
  insertAttachments,
  projectIsVisible,
} from "@/features/drawings/infrastructure/attachment-repository";
import {
  removeObjects,
  uploadObject,
} from "@/features/drawings/infrastructure/storage";

export type UploadAttachmentInput = {
  supabase: TypedSupabaseClient;
  userId: string;
  projectId: string;
  file: File | null;
  kind: string;
  view: string;
  ip: string | null;
};

export type UploadAttachmentDeps = {
  projectIsVisible: typeof projectIsVisible;
  uploadObject: typeof uploadObject;
  insertAttachments: typeof insertAttachments;
  removeObjects: typeof removeObjects;
  logAudit: typeof logAudit;
  newId: () => string;
};

const defaultDeps: UploadAttachmentDeps = {
  projectIsVisible,
  uploadObject,
  insertAttachments,
  removeObjects,
  logAudit,
  newId: () => crypto.randomUUID(),
};

export type UploadAttachmentResult =
  | { attachment: Attachment }
  | { error: string; status: number };

export async function uploadAttachment(
  input: UploadAttachmentInput,
  deps: UploadAttachmentDeps = defaultDeps,
): Promise<UploadAttachmentResult> {
  const { supabase, projectId, file } = input;

  const kind = coerceAttachmentKind(input.kind);
  const view = coerceAttachmentView(input.view);

  if (!file || typeof file.arrayBuffer !== "function") {
    return { error: "No file provided.", status: 400 };
  }
  const check = validateUpload(file);
  if ("error" in check) return check;
  const mime = file.type;

  if (!(await deps.projectIsVisible(supabase, projectId))) {
    return { error: "Project not found.", status: 404 };
  }

  const path = `${projectId}/${deps.newId()}-${safeUploadName(file.name)}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const upErr = await deps.uploadObject(path, bytes, mime);
  if (upErr) return { error: upErr, status: 400 };

  const rows: TablesInsert<"project_attachments">[] = [
    {
      project_id: projectId,
      kind,
      view,
      storage_path: path,
      filename: file.name,
      mime,
      size_bytes: file.size,
      page_index: null,
    },
  ];

  const inserted = await deps.insertAttachments(supabase, rows);
  if ("error" in inserted) {
    await deps.removeObjects([path]);
    return { error: inserted.error, status: 400 };
  }
  const row =
    inserted.rows.find((r) => (r.page_index ?? 0) === 0) ?? inserted.rows[0];

  await deps.logAudit(supabase, {
    userId: input.userId,
    action: "attachment_uploaded",
    projectId,
    detail: { kind, view, filename: file.name, mime },
    ip: input.ip,
  });

  return { attachment: row };
}
