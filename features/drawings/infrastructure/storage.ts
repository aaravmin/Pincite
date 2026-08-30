import "server-only";

/**
 * The private US-region `project-files` bucket. Objects are namespaced by `{projectId}/`.
 *
 * ALL OF IT GOES THROUGH THE ADMIN CLIENT. The cookie-based SSR client does not carry the
 * user JWT to Supabase Storage, so Storage RLS rejects its writes outright ("new row
 * violates RLS"). Every caller in the application layer verifies ownership with the USER
 * client first and only then reaches for these functions (see CLAUDE.md).
 *
 * The bucket also enforces an `allowed_mime_types` allowlist (scripts/setup-storage.mjs);
 * a type accepted by features/drawings/domain/upload-policy but missing there is rejected
 * here with a Storage 400.
 */
import { createAdminClient } from "@/shared/db/admin";

const BUCKET = "project-files";

export async function uploadObject(
  path: string,
  bytes: Buffer,
  contentType: string,
): Promise<string | null> {
  const { error } = await createAdminClient()
    .storage.from(BUCKET)
    .upload(path, bytes, { contentType, upsert: false });
  return error ? error.message : null;
}

/**
 * `error` is null when Storage failed without a message; the caller supplies its own wording
 * in that case, because the two read paths (the vision check and the attachment route) word
 * that fallback differently and both strings are user-visible.
 */
export async function downloadObject(
  path: string,
): Promise<{ bytes: Buffer } | { error: string | null }> {
  const { data, error } = await createAdminClient()
    .storage.from(BUCKET)
    .download(path);
  if (error || !data) return { error: error?.message ?? null };
  return { bytes: Buffer.from(await data.arrayBuffer()) };
}

export async function removeObjects(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await createAdminClient().storage.from(BUCKET).remove(paths);
}

export async function createSignedUrl(
  path: string,
  expiresInSecs: number,
): Promise<{ url: string } | { error: string }> {
  const { data, error } = await createAdminClient()
    .storage.from(BUCKET)
    .createSignedUrl(path, expiresInSecs);
  if (error || !data) return { error: error?.message ?? "Could not sign URL" };
  return { url: data.signedUrl };
}
