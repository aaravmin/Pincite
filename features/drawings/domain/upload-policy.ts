/**
 * What may be uploaded into the private project-files bucket, and under what name. The same
 * allowlist is enforced by the bucket itself (scripts/setup-storage.mjs `allowed_mime_types`),
 * so a type added here without adding it there will be rejected by Storage instead; keep the
 * two in step. Pure - the caller does the I/O.
 */
import {
  ATTACHMENT_VIEWS,
  type AttachmentKind,
} from "@/features/drawings/domain/types";

export const ALLOWED_UPLOAD_MIMES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
] as const;

/** 25 MB, matches the bucket limit. */
export const MAX_UPLOAD_BYTES = 26214400;

export type UploadCandidate = { type: string; size: number; name: string };
export type UploadValidation = { ok: true } | { error: string; status: number };

export function validateUpload(file: UploadCandidate): UploadValidation {
  if (!(ALLOWED_UPLOAD_MIMES as readonly string[]).includes(file.type)) {
    return {
      error: "Unsupported file type. Use PNG, JPEG, GIF, WEBP, or PDF.",
      status: 400,
    };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "File too large (max 25 MB).", status: 400 };
  }
  return { ok: true };
}

/**
 * A storage-safe object name derived from the uploaded filename. The original filename is
 * still stored on the row and shown to the user; only the object key is sanitized.
 */
export function safeUploadName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "file";
}

/** Anything that is not a known kind is treated as a drawing (the form's default). */
export function coerceAttachmentKind(raw: string): AttachmentKind {
  return raw === "supporting" || raw === "declaration" ? raw : "drawing";
}

/** An unknown or empty view is stored as null rather than a guess. */
export function coerceAttachmentView(raw: string): string | null {
  return raw && (ATTACHMENT_VIEWS as readonly string[]).includes(raw) ? raw : null;
}
