import "server-only";

/**
 * Persist the inventors named on the ADS. Replace-all, because the ADS is an ordered list.
 */
import { logAudit } from "@/shared/audit/log";
import type { TypedSupabaseClient } from "@/shared/db/types";
import { normalizeInventors } from "@/features/filing/domain/inventors";
import type { InventorInput } from "@/features/filing/domain/types";
import { replaceInventors } from "@/features/filing/infrastructure/inventors-repository";

export type SaveInventorsInput = {
  supabase: TypedSupabaseClient;
  userId: string;
  projectId: string;
  inventors: InventorInput[];
};

export type SaveInventorsDeps = {
  replaceInventors: typeof replaceInventors;
  logAudit: typeof logAudit;
};

const defaultDeps: SaveInventorsDeps = { replaceInventors, logAudit };

export async function saveInventors(
  input: SaveInventorsInput,
  deps: SaveInventorsDeps = defaultDeps,
): Promise<{ ok: true } | { error: string }> {
  const clean = normalizeInventors(input.inventors);

  const error = await deps.replaceInventors(
    input.supabase,
    input.projectId,
    clean,
  );
  if (error) return { error };

  await deps.logAudit(input.supabase, {
    userId: input.userId,
    action: "inventors_saved",
    projectId: input.projectId,
    detail: { count: clean.length },
  });
  return { ok: true };
}
