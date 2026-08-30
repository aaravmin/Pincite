import "server-only";

/**
 * The audit entries for one matter (roadmap §8). Append-only history, newest first.
 *
 * Visibility comes from the request-cached project snapshot: `null` means the matter is not
 * the viewer's and the caller answers notFound(). RLS then scopes audit_log to the signed-in
 * user as well, so one account can never read another's history.
 */
import { getViewer } from "@/shared/auth/require-viewer";
import { getProjectSnapshot } from "@/features/projects/application/get-project-snapshot";
import { loadProjectEntries } from "@/features/audit/infrastructure/audit-repository";
import type { AuditEntry } from "@/features/audit/domain/labels";

export async function getProjectAudit(
  projectId: string,
): Promise<AuditEntry[] | null> {
  const [viewer, snapshot] = await Promise.all([
    getViewer(),
    getProjectSnapshot(projectId),
  ]);
  if (!viewer || !snapshot) return null;
  return loadProjectEntries(viewer.supabase, projectId);
}
