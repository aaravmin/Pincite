import "server-only";

/**
 * Record a completed export. Two writes, both through the user-scoped client so RLS stays the
 * boundary: the `exports` row (the matter's export history, shown on the dashboard) and the
 * `export_generated` audit event.
 *
 * `exports.format` is constrained by a CHECK in the schema - a new format needs a migration,
 * or the insert is silently rejected (see CLAUDE.md).
 */
import { logAudit } from "@/shared/audit/log";
import type { TypedSupabaseClient } from "@/shared/db/types";

export async function recordExport(
  supabase: TypedSupabaseClient,
  userId: string,
  projectId: string,
  format: string,
): Promise<void> {
  await supabase
    .from("exports")
    .insert({ user_id: userId, project_id: projectId, format });
  await logAudit(supabase, {
    userId,
    action: "export_generated",
    projectId,
    detail: { format },
  });
}
