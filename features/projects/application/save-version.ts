import "server-only";

/**
 * Append an immutable snapshot of the matter (roadmap §8). Saves are append-only: this
 * always INSERTS a new version, never overwrites an earlier one, so the history is a record
 * rather than a working copy.
 */
import { requireViewer } from "@/shared/auth/require-viewer";
import { logAudit } from "@/shared/audit/log";
import {
  insertVersion,
  loadSnapshotSource,
} from "@/features/projects/infrastructure/project-repository";

export type SaveVersionDeps = {
  requireViewer: typeof requireViewer;
  loadSnapshotSource: typeof loadSnapshotSource;
  insertVersion: typeof insertVersion;
  logAudit: typeof logAudit;
};

const defaultDeps: SaveVersionDeps = {
  requireViewer,
  loadSnapshotSource,
  insertVersion,
  logAudit,
};

export async function saveVersion(
  input: { projectId: string; label?: string },
  deps: SaveVersionDeps = defaultDeps,
): Promise<{ id: string } | { error: string }> {
  const { supabase, user } = await deps.requireViewer();
  const snapshot = await deps.loadSnapshotSource(supabase, input.projectId);
  const label = input.label?.trim() || null;
  const created = await deps.insertVersion(
    supabase,
    {
      projectId: input.projectId,
      userId: user.id,
      label,
      snapshot,
      parentVersionId: null,
    },
    "Could not save version.",
  );
  if ("error" in created) return created;

  await deps.logAudit(supabase, {
    userId: user.id,
    action: "version_saved",
    projectId: input.projectId,
    versionId: created.id,
    detail: { label },
  });
  return { id: created.id };
}
