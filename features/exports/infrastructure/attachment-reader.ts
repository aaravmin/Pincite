import "server-only";

/**
 * Read uploaded attachment bytes out of the private `project-files` bucket.
 *
 * Uses the service-role client on purpose: the cookie-based SSR server client does not carry
 * the user JWT to Supabase Storage, so Storage RLS rejects reads made with it (see CLAUDE.md,
 * "Storage needs the admin client"). Because that client bypasses RLS, the CALLER must have
 * already established that the viewer may see this matter - the export application only ever
 * passes paths that came out of a project snapshot loaded through the user-scoped client.
 *
 * A file that cannot be read is skipped rather than failing the whole export: a single broken
 * upload must not stop the user downloading their application. The caller detects a skipped
 * file by its path being absent from the returned map.
 */
import { createAdminClient } from "@/shared/db/admin";

export async function readAttachmentBytes(
  paths: string[],
): Promise<Map<string, Uint8Array>> {
  const unique = [...new Set(paths)];
  if (unique.length === 0) return new Map();

  const admin = createAdminClient();
  const bucket = admin.storage.from("project-files");
  // The downloads are independent of each other, so they run together.
  const results = await Promise.all(
    unique.map(async (path) => {
      try {
        const { data: blob } = await bucket.download(path);
        if (!blob) return null;
        return [path, new Uint8Array(await blob.arrayBuffer())] as const;
      } catch {
        return null;
      }
    }),
  );

  const bytes = new Map<string, Uint8Array>();
  for (const entry of results) if (entry) bytes.set(entry[0], entry[1]);
  return bytes;
}
