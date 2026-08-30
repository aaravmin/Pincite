import "server-only";

/** The saves for a matter, newest first, for the dashboard "open a save" menu. RLS-scoped. */
import { requireViewer } from "@/shared/auth/require-viewer";
import { listVersionSummaries } from "@/features/projects/infrastructure/project-repository";

export type VersionSummary = {
  id: string;
  label: string | null;
  created_at: string;
};

export async function listProjectVersions(
  projectId: string,
): Promise<VersionSummary[]> {
  const { supabase } = await requireViewer();
  return listVersionSummaries(supabase, projectId);
}
