import "server-only";

/**
 * Read uploaded attachment bytes out of the private `project-files` bucket.
 *
 * Uses the service-role client on purpose: the cookie-based SSR server client does not carry
 * the user JWT to Supabase Storage, so Storage RLS rejects reads made with it (the "Storage
 * needs the admin client" rule in the README). Because that client bypasses RLS, the CALLER must have
 * already established that the viewer may see this matter - the export application only ever
 * passes paths that came out of a project snapshot loaded through the user-scoped client.
 *
 * A file that cannot be read is skipped rather than failing the whole export: a single broken
 * upload must not stop the user downloading their application. The caller detects a skipped
 * file by its path being absent from the returned map.
 *
 * The downloads are independent, so they overlap - but only CONCURRENCY at a time. A matter
 * with dozens of figures would otherwise open one Storage connection per file and hold every
 * decoded file in memory at once, on a serverless function sized for one request.
 */
import { createAdminClient } from "@/shared/db/admin";

const CONCURRENCY = 4;

export async function readAttachmentBytes(
  paths: string[],
): Promise<Map<string, Uint8Array>> {
  const unique = [...new Set(paths)];
  if (unique.length === 0) return new Map();

  const admin = createAdminClient();
  const bucket = admin.storage.from("project-files");
  const bytes = new Map<string, Uint8Array>();

  // A fixed pool of workers pulling from one shared cursor, so a slow file delays only its
  // own worker and the pool stays full until every path has been attempted.
  let next = 0;
  const worker = async () => {
    while (next < unique.length) {
      const path = unique[next++];
      try {
        const { data: blob } = await bucket.download(path);
        if (blob) bytes.set(path, new Uint8Array(await blob.arrayBuffer()));
      } catch {
        // Skipped: the caller sees the path missing from the map.
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, unique.length) }, worker),
  );

  return bytes;
}
