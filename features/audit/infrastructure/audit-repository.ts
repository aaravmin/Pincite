import "server-only";

/**
 * Reads over the append-only `audit_log` table. RLS scopes every row to the signed-in user,
 * so one account can never read another's history; the explicit filters say the same thing
 * at the application layer. Nothing here writes - entries are appended by
 * `shared/audit/log.ts` at the moment the audited action happens.
 */
import type { TypedSupabaseClient } from "@/shared/db/types";
import type { AuditEntry } from "@/features/audit/domain/labels";
import { AUDIT_CSV_COLUMNS } from "@/features/audit/domain/csv";

const PROJECT_PAGE_LIMIT = 500;
const EXPORT_ROW_LIMIT = 10000;

/** The entries for one matter, newest first. */
export async function loadProjectEntries(
  supabase: TypedSupabaseClient,
  projectId: string,
): Promise<AuditEntry[]> {
  const { data } = await supabase
    .from("audit_log")
    .select("id, action, detail, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(PROJECT_PAGE_LIMIT);
  return (data ?? []).map((r) => ({
    id: r.id,
    action: r.action,
    // `detail` is a jsonb column; every writer stores an object or null.
    detail: (r.detail as Record<string, unknown> | null) ?? null,
    created_at: r.created_at,
  }));
}

/** Every entry for one user, newest first, in the CSV column order. */
export async function loadUserEntriesForExport(
  supabase: TypedSupabaseClient,
  userId: string,
): Promise<{ rows: Record<string, unknown>[] } | { error: string }> {
  const { data, error } = await supabase
    .from("audit_log")
    .select(AUDIT_CSV_COLUMNS.join(", "))
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(EXPORT_ROW_LIMIT);
  if (error) return { error: error.message };
  return { rows: (data ?? []) as unknown as Record<string, unknown>[] };
}
