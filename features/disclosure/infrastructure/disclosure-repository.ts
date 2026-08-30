import "server-only";

/**
 * Persistence for the invention disclosure. One row per project, upserted on `project_id`;
 * RLS scopes the write to the owner. The READ lives with the rest of the per-matter snapshot
 * (`features/projects/infrastructure/snapshot-repository.ts`), so a screen never issues a
 * second disclosure query of its own.
 */
import type { TablesInsert, TypedSupabaseClient } from "@/shared/db/types";

export async function upsertDisclosure(
  supabase: TypedSupabaseClient,
  row: TablesInsert<"project_disclosure">,
): Promise<string | null> {
  const { error } = await supabase
    .from("project_disclosure")
    .upsert(row, { onConflict: "project_id" });
  return error ? error.message : null;
}
