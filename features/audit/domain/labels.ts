/**
 * Display labels for the audit-log viewer. PURE and client-safe: no server
 * imports, so the client viewer and the server page share one map.
 *
 * Typed as Record<AuditAction, string> deliberately - the two lists used to drift, and the
 * viewer rendered raw snake_case for the actions nobody had labelled. Adding an action to
 * `shared/audit/action-types.ts` now fails the build until it has a human label here.
 */
import type { AuditAction } from "@/shared/audit/action-types";

export type AuditEntry = {
  id: number;
  action: string;
  detail: Record<string, unknown> | null;
  created_at: string;
};

export const ACTION_LABELS: Record<AuditAction, string> = {
  login: "Signed in",
  logout: "Signed out",
  consent_granted: "Consent granted",
  project_created: "Project created",
  project_status_changed: "Status changed",
  section_edited: "Section edited",
  version_saved: "Version saved",
  version_restored: "Version restored",
  version_branched: "Version branched",
  findings_run: "Issue check run",
  prior_art_searched: "Prior-art searched",
  rule_surfaced: "Rules surfaced",
  export_generated: "Export generated",
  role_selected: "Role selected",
  applicant_saved: "Applicant saved",
  inventors_saved: "Inventors saved",
  declaration_signed: "Declaration signed",
  attachment_uploaded: "File uploaded",
  attachment_deleted: "File removed",
  disclosure_saved: "Disclosure saved",
  drawing_analyzed: "Drawing checked",
  drawing_oriented: "Drawing view set",
  project_deleted: "Patent removed",
};

/**
 * The human label for a recorded action. `audit_log.action` is a text column, so a row
 * written by an older build can carry a value outside the union; fall back to the raw
 * value rather than rendering nothing.
 */
export function actionLabel(action: string): string {
  return ACTION_LABELS[action as AuditAction] ?? action;
}
