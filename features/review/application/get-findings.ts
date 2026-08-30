import "server-only";

/**
 * The stored findings for one matter, read with the viewer's own client so RLS scopes the
 * rows to the owner. Used by screens outside the Review feature that need the findings but
 * not the whole review page model - today the export report (features/exports).
 *
 * `getViewer` rather than `requireViewer`, because this runs under the export route handler
 * as well as under a page: a handler answers 401 before it gets here, and must never be
 * redirected to an HTML login page. With no viewer there is nothing the caller may see, so
 * the answer is an empty list - the same thing RLS would return.
 */
import { getViewer } from "@/shared/auth/require-viewer";
import { loadFindings } from "@/features/review/infrastructure/findings-repository";
import type { FindingRow } from "@/features/review/domain/finding";

export async function loadProjectFindings(
  projectId: string,
): Promise<FindingRow[]> {
  const viewer = await getViewer();
  if (!viewer) return [];
  return loadFindings(viewer.supabase, projectId);
}
