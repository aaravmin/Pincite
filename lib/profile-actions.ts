"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { USER_ROLES, type UserRole } from "@/lib/profile";

/** Switch the signed-in user's role (patent agent/attorney <-> pro se inventor). */
export async function updateRole(
  role: UserRole,
): Promise<{ ok: true } | { error: string }> {
  if (!USER_ROLES.includes(role)) return { error: "Invalid role." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}
