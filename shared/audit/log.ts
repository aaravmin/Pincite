import "server-only";
import type { Json, TypedSupabaseClient } from "@/shared/db/types";
import type { AuditAction } from "@/shared/audit/action-types";

export type { AuditAction } from "@/shared/audit/action-types";

export async function logAudit(
  supabase: TypedSupabaseClient,
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
    // `detail` is a jsonb column; a plain record of serializable values is valid JSON.
    detail: (params.detail ?? null) as Json | null,
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
