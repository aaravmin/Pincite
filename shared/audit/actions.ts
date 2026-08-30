/**
 * The set of meaningful actions recorded in audit_log (roadmap §3, §8). Append-only.
 *
 * PURE and client-safe on purpose: the audit viewer's display labels are keyed by this
 * union (`features/audit/domain/labels.ts`), so the compiler forces a new action to get a
 * human label. `shared/audit/log.ts` (server-only) imports the union from here rather than
 * declaring it, so there is exactly one list.
 */
export type AuditAction =
  | "login"
  | "logout"
  | "consent_granted"
  | "project_created"
  | "project_status_changed"
  | "section_edited"
  | "version_saved"
  | "version_restored"
  | "version_branched"
  | "findings_run"
  | "prior_art_searched"
  | "rule_surfaced"
  | "export_generated"
  | "role_selected"
  | "applicant_saved"
  | "inventors_saved"
  | "declaration_signed"
  | "attachment_uploaded"
  | "attachment_deleted"
  | "disclosure_saved"
  | "drawing_analyzed"
  | "drawing_oriented"
  | "project_deleted";
