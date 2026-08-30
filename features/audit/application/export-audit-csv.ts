import "server-only";

/**
 * Export the signed-in user's full audit log as CSV. RLS scopes the rows to this user, so
 * one account can never export another's history; the explicit user_id filter says so at
 * the application layer too.
 */
import type { TypedSupabaseClient } from "@/shared/db/types";
import { AUDIT_CSV_COLUMNS, toAuditCsv } from "@/features/audit/domain/csv";

const EXPORT_ROW_LIMIT = 10000;

export const AUDIT_CSV_FILENAME = "pincite_audit_log.csv";

export async function exportAuditCsv(
  supabase: TypedSupabaseClient,
  userId: string,
): Promise<{ ok: true; csv: string } | { error: string }> {
  const { data, error } = await supabase
    .from("audit_log")
    .select(AUDIT_CSV_COLUMNS.join(", "))
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(EXPORT_ROW_LIMIT);
  if (error) return { error: error.message };
  return {
    ok: true,
    csv: toAuditCsv((data ?? []) as unknown as Record<string, unknown>[]),
  };
}
