"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

/** Record an export (roadmap §9) - used by the print-to-PDF path; TXT is logged in its
 * route handler. Writes to exports + the audit log. */
export async function logExport(
  projectId: string,
  format: "pdf" | "txt",
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("exports")
    .insert({ user_id: user.id, project_id: projectId, format });
  if (error) return { error: error.message };

  await logAudit(supabase, {
    userId: user.id,
    action: "export_generated",
    projectId,
    detail: { format },
  });
  return { ok: true };
}
