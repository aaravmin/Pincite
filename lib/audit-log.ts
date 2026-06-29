/** Labels + type for the audit-log viewer (roadmap §8). Client-safe: no server imports,
 * so it can be shared by the client viewer and the server page. The query lives in the
 * audit page (server). */

export type AuditEntry = {
  id: number;
  action: string;
  detail: Record<string, unknown> | null;
  created_at: string;
};

export const ACTION_LABELS: Record<string, string> = {
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
  project_deleted: "Patent removed",
};
