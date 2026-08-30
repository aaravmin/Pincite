import "server-only";

/**
 * The shared core of restore and branch: load an earlier snapshot back into the working
 * draft and append a NEW immutable version that links to its source. Newer history is never
 * deleted - "restore" and "branch" differ only in the label they write, so the trail always
 * shows what was reopened and when.
 */
import { requireViewer } from "@/shared/auth/require-viewer";
import { logAudit } from "@/shared/audit/log";
import {
  insertVersion,
  loadVersion,
  touchProject,
  upsertSections,
  type SectionUpsert,
} from "@/features/projects/infrastructure/project-repository";
import { SECTION_KEYS, wordCount } from "@/features/projects/domain/sections";

export type ReopenMode = "restore" | "branch";

export type ReopenVersionDeps = {
  requireViewer: typeof requireViewer;
  loadVersion: typeof loadVersion;
  upsertSections: typeof upsertSections;
  touchProject: typeof touchProject;
  insertVersion: typeof insertVersion;
  logAudit: typeof logAudit;
  now: () => string;
};

const defaultDeps: ReopenVersionDeps = {
  requireViewer,
  loadVersion,
  upsertSections,
  touchProject,
  insertVersion,
  logAudit,
  now: () => new Date().toISOString(),
};

export async function reopenVersion(
  input: { projectId: string; versionId: string; mode: ReopenMode },
  deps: ReopenVersionDeps = defaultDeps,
): Promise<{ id: string } | { error: string }> {
  const { projectId, versionId, mode } = input;
  const { supabase, user } = await deps.requireViewer();

  const loaded = await deps.loadVersion(supabase, versionId);
  if ("error" in loaded) return loaded;
  const source = loaded.version;
  // A version from another matter is not this matter's history, even if RLS let it through.
  if (!source || source.project_id !== projectId) {
    return { error: "Version not found." };
  }

  const snapshot = source.snapshot;
  const now = deps.now();

  const rows: SectionUpsert[] = SECTION_KEYS.filter(
    (k) => k in snapshot.sections,
  ).map((k) => ({
    project_id: projectId,
    section_key: k,
    content: snapshot.sections[k] ?? "",
    word_count: wordCount(snapshot.sections[k] ?? ""),
    updated_at: now,
  }));
  const written = await deps.upsertSections(supabase, rows);
  if ("error" in written) return written;
  await deps.touchProject(supabase, projectId, now);

  const sourceName =
    source.label ||
    new Date(source.created_at).toISOString().slice(0, 16).replace("T", " ");
  const label =
    mode === "restore"
      ? `Restored from ${sourceName}`
      : `Branch from ${sourceName}`;

  const created = await deps.insertVersion(
    supabase,
    {
      projectId,
      userId: user.id,
      label,
      snapshot,
      parentVersionId: versionId,
    },
    "Could not reopen version.",
  );
  if ("error" in created) return created;

  await deps.logAudit(supabase, {
    userId: user.id,
    action: mode === "restore" ? "version_restored" : "version_branched",
    projectId,
    versionId: created.id,
    detail: { source_version_id: versionId, mode },
  });
  return { id: created.id };
}
