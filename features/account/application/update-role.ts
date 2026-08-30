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

export async function changeRole(
  viewer: Viewer,
  role: UserRole,
): Promise<{ ok: true } | { error: string }> {
  if (!USER_ROLES.includes(role)) return { error: "Invalid role." };

  const { supabase, user } = viewer;
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", user.id);
  if (error) return { error: error.message };

  await logAudit(supabase, {
    userId: user.id,
    action: "role_selected",
    detail: { role, via: "settings" },
  });
  return { ok: true };
}
