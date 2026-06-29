import { type SupabaseClient } from "@supabase/supabase-js";

/** Meaningful actions recorded in audit_log (roadmap §3, §8). Append-only. */
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
  | "project_deleted";

export async function logAudit(
  supabase: SupabaseClient,
  params: {
    userId: string;
    action: AuditAction;
    detail?: Record<string, unknown> | null;
    projectId?: string | null;
    versionId?: string | null;
    ip?: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from("audit_log").insert({
    user_id: params.userId,
    action: params.action,
    detail: params.detail ?? null,
    project_id: params.projectId ?? null,
    version_id: params.versionId ?? null,
    ip: params.ip ?? null,
  });
  if (error) {
    // Never block the user action on an audit failure; surface it in logs.
    console.error(`[audit] failed to log "${params.action}":`, error.message);
  }
}

/** Best-effort client IP from proxy headers. */
export function clientIp(request: Request): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}
