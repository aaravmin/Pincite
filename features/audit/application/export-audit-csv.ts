import "server-only";

/**
 * Export the signed-in user's full audit log as CSV. RLS scopes the rows to this user, so
 * one account can never export another's history; the explicit user_id filter in the
 * repository says so at the application layer too.
 */
import type { TypedSupabaseClient } from "@/shared/db/types";
import { toAuditCsv } from "@/features/audit/domain/csv";
import { loadUserEntriesForExport } from "@/features/audit/infrastructure/audit-repository";

export const AUDIT_CSV_FILENAME = "pincite_audit_log.csv";

export async function exportAuditCsv(
  supabase: TypedSupabaseClient,
  userId: string,
): Promise<{ ok: true; csv: string } | { error: string }> {
  const result = await loadUserEntriesForExport(supabase, userId);
  if ("error" in result) return { error: result.error };
  return { ok: true, csv: toAuditCsv(result.rows) };
}
