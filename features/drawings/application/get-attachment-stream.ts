import "server-only";

/**
 * Read one private attachment on behalf of its owner. Two shapes, because the two consumers
 * need different things: a short-lived signed URL is right for <img> previews and downloads,
 * while `raw` streams the bytes back through this same origin so a canvas can read the image
 * without being tainted.
 *
 * Ownership is confirmed with the USER client (RLS); only then does the admin client touch
 * Storage.
 */
import type { TypedSupabaseClient } from "@/shared/db/types";
import { findAttachment } from "@/features/drawings/infrastructure/attachment-repository";
import {
  createSignedUrl,
  downloadObject,
} from "@/features/drawings/infrastructure/storage";

/** How long a signed attachment URL stays valid, in seconds. */
const SIGNED_URL_TTL = 120;

export type AttachmentStream =
  | { kind: "bytes"; bytes: Buffer; contentType: string }
  | { kind: "redirect"; url: string }
  | { error: string; status: number };

export type GetAttachmentStreamInput = {
  supabase: TypedSupabaseClient;
  projectId: string;
  attachmentId: string;
  raw: boolean;
};

export type GetAttachmentStreamDeps = {
  findAttachment: typeof findAttachment;
  downloadObject: typeof downloadObject;
  createSignedUrl: typeof createSignedUrl;
};

const defaultDeps: GetAttachmentStreamDeps = {
  findAttachment,
  downloadObject,
  createSignedUrl,
};

export async function getAttachmentStream(
  input: GetAttachmentStreamInput,
  deps: GetAttachmentStreamDeps = defaultDeps,
): Promise<AttachmentStream> {
  const row = await deps.findAttachment(
    input.supabase,
    input.projectId,
    input.attachmentId,
  );
  if (!row) return { error: "Not found", status: 404 };

  if (input.raw) {
    const file = await deps.downloadObject(row.storage_path);
    if ("error" in file) {
      return { error: file.error ?? "Could not read the file", status: 400 };
    }
    return {
      kind: "bytes",
      bytes: file.bytes,
      contentType: row.mime || "application/octet-stream",
    };
  }

  const signed = await deps.createSignedUrl(row.storage_path, SIGNED_URL_TTL);
  if ("error" in signed) return { error: signed.error, status: 400 };
  return { kind: "redirect", url: signed.url };
}
