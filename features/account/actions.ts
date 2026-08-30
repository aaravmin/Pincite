"use server";

/**
 * Account mutations: the login audit record and the role switch. Both are thin - they
 * resolve the viewer, call one application operation, and revalidate.
 */
import { revalidatePath } from "next/cache";
import { logAudit } from "@/shared/audit/log";
import { getViewer, requireViewer } from "@/shared/auth/require-viewer";
import { changeRole } from "@/features/account/application/update-role";
import type { UserRole } from "@/shared/auth/types";

/**
 * Record an email/password login in the audit log (OAuth logs via the callback route).
 * Runs immediately after sign-in, BEFORE consent exists, so it must not gate on consent -
 * and it stays silent when there is no session rather than redirecting a form handler.
 */
export async function recordLogin(): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) return;
  await logAudit(viewer.supabase, {
    userId: viewer.user.id,
    action: "login",
    detail: { provider: "email" },
  });
}

/** Switch the signed-in user's role (patent agent/attorney <-> pro se inventor). */
export async function updateRole(
  role: UserRole,
): Promise<{ ok: true } | { error: string }> {
  const viewer = await requireViewer();
  const result = await changeRole(viewer, role);
  if ("error" in result) return result;

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return result;
}
