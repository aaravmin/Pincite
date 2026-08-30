"use server";

/**
 * Filing-record mutations: the inventors named on the ADS and the applicant/entity fields.
 * Drawing operations live in features/drawings/actions.ts.
 */
import { revalidatePath } from "next/cache";
import { requireViewer } from "@/shared/auth/require-viewer";
import { saveApplicant as saveApplicantOp } from "@/features/filing/application/save-applicant";
import { saveInventors as saveInventorsOp } from "@/features/filing/application/save-inventors";
import type { InventorInput } from "@/features/filing/domain/types";
import type { EntityStatus } from "@/lib/projects/sections";

export async function saveInventors(input: {
  projectId: string;
  inventors: InventorInput[];
}): Promise<{ ok: true } | { error: string }> {
  const { supabase, user } = await requireViewer();
  const result = await saveInventorsOp({
    supabase,
    userId: user.id,
    projectId: input.projectId,
    inventors: input.inventors,
  });
  if ("error" in result) return result;
  revalidatePath(`/projects/${input.projectId}/inventors`);
  return result;
}

export async function saveApplicant(input: {
  projectId: string;
  applicantName: string;
  applicantIsInventor: boolean;
  applicantIsJuristic: boolean;
  entityStatus: EntityStatus;
}): Promise<{ ok: true } | { error: string }> {
  const { supabase, user } = await requireViewer();
  const result = await saveApplicantOp({
    supabase,
    userId: user.id,
    projectId: input.projectId,
    applicantName: input.applicantName,
    applicantIsInventor: input.applicantIsInventor,
    applicantIsJuristic: input.applicantIsJuristic,
    entityStatus: input.entityStatus,
  });
  if ("error" in result) return result;
  revalidatePath(`/projects/${input.projectId}/inventors`);
  return result;
}
