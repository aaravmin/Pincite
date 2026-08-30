import "server-only";

/**
 * Persistence for the invention disclosure. One row per project, upserted on `project_id`;
 * RLS scopes both the read and the write to the owner.
 */
import type { TablesInsert, TypedSupabaseClient } from "@/shared/db/types";
import {
  toDisclosure,
  type Disclosure,
} from "@/features/disclosure/domain/types";

export async function loadDisclosure(
  supabase: TypedSupabaseClient,
  projectId: string,
): Promise<Disclosure> {
  const { data, error } = await supabase
    .from("project_disclosure")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw new Error(`load disclosure: ${error.message}`);
  return toDisclosure(data);
}

export async function upsertDisclosure(
  supabase: TypedSupabaseClient,
  row: TablesInsert<"project_disclosure">,
): Promise<string | null> {
  const { error } = await supabase
    .from("project_disclosure")
    .upsert(row, { onConflict: "project_id" });
  return error ? error.message : null;
}
