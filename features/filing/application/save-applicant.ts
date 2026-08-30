import "server-only";

/**
 * Persist who is applying and at which fee tier. An unrecognized entity status falls back to
 * "large", the conservative choice: undercounting the entity understates the USPTO fee.
 */
import { logAudit } from "@/shared/audit/log";
import type { TypedSupabaseClient } from "@/shared/db/types";
import { ENTITY_STATUSES, type EntityStatus } from "@/features/projects/domain/sections";
import { updateApplicant } from "@/features/filing/infrastructure/inventors-repository";

export type SaveApplicantInput = {
  supabase: TypedSupabaseClient;
  userId: string;
  projectId: string;
  applicantName: string;
  applicantIsInventor: boolean;
  applicantIsJuristic: boolean;
  entityStatus: EntityStatus;
};

export type SaveApplicantDeps = {
  updateApplicant: typeof updateApplicant;
  logAudit: typeof logAudit;
};

const defaultDeps: SaveApplicantDeps = { updateApplicant, logAudit };

export async function saveApplicant(
  input: SaveApplicantInput,
  deps: SaveApplicantDeps = defaultDeps,
): Promise<{ ok: true } | { error: string }> {
  const entity = ENTITY_STATUSES.includes(input.entityStatus)
    ? input.entityStatus
    : "large";

  const error = await deps.updateApplicant(input.supabase, input.projectId, {
    applicant_name: input.applicantName?.trim() || null,
    applicant_is_inventor: input.applicantIsInventor,
    applicant_is_juristic: input.applicantIsJuristic,
    entity_status: entity,
  });
  if (error) return { error };

  await deps.logAudit(input.supabase, {
    userId: input.userId,
    action: "applicant_saved",
    projectId: input.projectId,
    detail: { entity_status: entity, juristic: input.applicantIsJuristic },
  });
  return { ok: true };
}
