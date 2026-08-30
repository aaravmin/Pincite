import "server-only";

/**
 * The audit entries for one matter (roadmap §8). Append-only history, newest first. RLS
 * scopes audit_log to the signed-in user, so one account can never read another's history;
 * the caller has already established that this project is visible to the viewer.
 */
import type { TypedSupabaseClient } from "@/shared/db/types";
import type { AuditEntry } from "@/features/audit/domain/labels";

const AUDIT_PAGE_LIMIT = 500;

export async function getProjectAudit(
  supabase: TypedSupabaseClient,
  projectId: string,
): Promise<AuditEntry[]> {
  const { data } = await supabase
    .from("audit_log")
    .select("id, action, detail, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(AUDIT_PAGE_LIMIT);
  return (data ?? []).map((r) => ({
    id: r.id,
    action: r.action,
    // `detail` is a jsonb column; every writer stores an object or null.
    detail: (r.detail as Record<string, unknown> | null) ?? null,
    created_at: r.created_at,
  }));
}
