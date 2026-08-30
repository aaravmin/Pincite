/**
 * Export the signed-in user's full audit log as CSV. RLS scopes the rows to this user, so
 * one account can never export another's history.
 */
import { getViewer } from "@/shared/auth/require-viewer";
import {
  AUDIT_CSV_FILENAME,
  exportAuditCsv,
} from "@/features/audit/application/export-audit-csv";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return new Response("Unauthorized", { status: 401 });

  const result = await exportAuditCsv(viewer.supabase, viewer.user.id);
  if ("error" in result) return new Response(result.error, { status: 500 });

  return new Response(result.csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${AUDIT_CSV_FILENAME}"`,
      "Cache-Control": "no-store",
    },
  });
}
