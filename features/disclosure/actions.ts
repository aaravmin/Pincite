"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "@/shared/auth/require-viewer";
import { saveDisclosure as saveDisclosureOp } from "@/features/disclosure/application/save-disclosure";
import type { Disclosure } from "@/features/disclosure/domain/types";

export async function saveDisclosure(input: {
  projectId: string;
  values: Disclosure;
}): Promise<{ ok: true } | { error: string }> {
  const { supabase, user } = await requireViewer();
  const result = await saveDisclosureOp({
    supabase,
    userId: user.id,
    projectId: input.projectId,
    values: input.values,
  });
  if ("error" in result) return result;
  revalidatePath(`/projects/${input.projectId}/disclosure`);
  return result;
}
