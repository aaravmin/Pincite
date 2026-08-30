import "server-only";

/**
 * Update the declared lifecycle status (and the application number / filing date that come
 * with it). The declared status drives stage detection and the deadline-bound lifecycle
 * actions, so it is audited like any other substantive change.
 */
import { requireViewer } from "@/shared/auth/require-viewer";
import { logAudit } from "@/shared/audit/log";
import { updateProject } from "@/features/projects/infrastructure/project-repository";
import {
  PROJECT_STATUSES,
  type ProjectStatus,
} from "@/features/projects/domain/sections";
import type { TablesUpdate } from "@/shared/db/types";

export type UpdateProjectStatusInput = {
  projectId: string;
  declared_status: ProjectStatus;
  application_number?: string;
  filing_date?: string | null;
};

export type UpdateProjectStatusDeps = {
  requireViewer: typeof requireViewer;
  updateProject: typeof updateProject;
  logAudit: typeof logAudit;
};

const defaultDeps: UpdateProjectStatusDeps = {
  requireViewer,
  updateProject,
  logAudit,
};

export async function updateProjectStatus(
  input: UpdateProjectStatusInput,
  deps: UpdateProjectStatusDeps = defaultDeps,
): Promise<{ ok: true } | { error: string }> {
  if (!PROJECT_STATUSES.includes(input.declared_status)) {
    return { error: "Unknown status." };
  }
  const { supabase, user } = await deps.requireViewer();
  const patch: TablesUpdate<"projects"> = {
    declared_status: input.declared_status,
  };
  if (input.application_number !== undefined) {
    patch.application_number = input.application_number.trim() || null;
  }
  if (input.filing_date !== undefined) {
    patch.filing_date = input.filing_date || null;
  }

  const updated = await deps.updateProject(supabase, input.projectId, patch);
  if ("error" in updated) return updated;

  await deps.logAudit(supabase, {
    userId: user.id,
    action: "project_status_changed",
    projectId: input.projectId,
    detail: patch,
  });
  return { ok: true };
}
