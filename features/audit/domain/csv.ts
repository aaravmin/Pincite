/**
 * Pure CSV serialization for the audit-log export. Every cell goes through the shared
 * output sanitizer and is quoted, so a detail value can never break out of its cell or be
 * interpreted as a formula by a spreadsheet.
 */
import { sanitizeOutputText } from "@/shared/text/sanitize";

export const AUDIT_CSV_COLUMNS = [
  "created_at",
  "action",
  "project_id",
  "detail",
  "ip",
] as const;

export function csvCell(v: unknown): string {
  const s =
    v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return `"${sanitizeOutputText(s).replace(/"/g, '""')}"`;
}

/** Header row plus one row per record, in the column order above. */
export function toAuditCsv(rows: readonly Record<string, unknown>[]): string {
  const header = [...AUDIT_CSV_COLUMNS];
  return [
    header.join(","),
    ...rows.map((r) => header.map((h) => csvCell(r[h])).join(",")),
  ].join("\n");
}
