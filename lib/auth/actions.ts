"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

/** Record an email/password login in the audit log (OAuth logs via the callback route). */
export async function recordLogin(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await logAudit(supabase, {
    userId: user.id,
    action: "login",
    detail: { provider: "email" },
  });
}
