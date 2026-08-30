import "server-only";

/**
 * Change the signed-in user's role. Role is not a cosmetic preference: it decides which
 * filing path the workflow presents (a pro se inventor signs their own declaration under
 * 37 CFR 1.63; an attorney manages the power of attorney and never signs the inventor's
 * oath), so the change is validated against the DB enum and recorded in the audit log.
 * The user's work is untouched.
 */
import { logAudit } from "@/shared/audit/log";
import type { Viewer } from "@/shared/auth/require-viewer";
import { USER_ROLES, type UserRole } from "@/shared/auth/types";
import { updateProfileRole } from "@/features/account/infrastructure/profile-repository";

export async function changeRole(
  viewer: Viewer,
  role: UserRole,
  /** Audit context: where the change came from, and the request IP when there is one. */
  options: { via?: string; ip?: string | null } = {},
): Promise<{ ok: true } | { error: string }> {
  if (!USER_ROLES.includes(role)) return { error: "Invalid role." };

  const { supabase, user } = viewer;
  const { error } = await updateProfileRole(supabase, user.id, role);
  if (error) return { error };

  await logAudit(supabase, {
    userId: user.id,
    action: "role_selected",
    detail: options.via ? { role, via: options.via } : { role },
    ip: options.ip,
  });
  return { ok: true };
}
