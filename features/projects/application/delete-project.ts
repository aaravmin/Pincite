import "server-only";

/**
 * Permanently remove a patent and its history (sections, versions, findings, and the rest
 * cascade). Admin only - gated on the AUTHENTICATED user's email, never on anything the
 * client sends - so a regular user cannot delete patents, only the admin can.
 */
import { requireViewer } from "@/shared/auth/require-viewer";
import { logAudit } from "@/shared/audit/log";
import { isAdminEmail } from "@/shared/auth/admin-allowlist";
import {
  deleteProject as deleteProjectRow,
  getProjectName,
} from "@/features/projects/infrastructure/project-repository";

export type DeleteProjectDeps = {
  requireViewer: typeof requireViewer;
  getProjectName: typeof getProjectName;
  deleteProject: typeof deleteProjectRow;
  logAudit: typeof logAudit;
};

const defaultDeps: DeleteProjectDeps = {
  requireViewer,
  getProjectName,
  deleteProject: deleteProjectRow,
  logAudit,
};

export async function deleteProject(
  input: { projectId: string },
  deps: DeleteProjectDeps = defaultDeps,
): Promise<{ ok: true } | { error: string }> {
  const { supabase, user } = await deps.requireViewer();
  if (!isAdminEmail(user.email)) {
    return { error: "Only the admin can remove patents." };
  }
  const name = await deps.getProjectName(supabase, input.projectId);
  const removed = await deps.deleteProject(supabase, input.projectId);
  if ("error" in removed) return removed;

  await deps.logAudit(supabase, {
    userId: user.id,
    action: "project_deleted",
    projectId: input.projectId,
    detail: { name },
  });
  return { ok: true };
}
