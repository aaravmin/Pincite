"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { DISCLOSURE_FIELDS, type Disclosure } from "@/lib/disclosure/types";

export async function saveDisclosure(input: {
  projectId: string;
  values: Disclosure;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const row: Record<string, unknown> = {
    project_id: input.projectId,
    updated_at: new Date().toISOString(),
  };
  for (const f of DISCLOSURE_FIELDS) {
    row[f.key] = (input.values[f.key] ?? "").trim();
  }

  const { error } = await supabase
    .from("project_disclosure")
    .upsert(row, { onConflict: "project_id" });
  if (error) return { error: error.message };

  await logAudit(supabase, {
    userId: user.id,
    action: "disclosure_saved",
    projectId: input.projectId,
  });
  revalidatePath(`/projects/${input.projectId}/disclosure`);
  return { ok: true };
}
