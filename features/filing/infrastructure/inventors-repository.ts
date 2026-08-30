import "server-only";

/**
 * Persistence for the ADS filing record: the named inventors and the applicant/entity fields
 * that live on the project row. Every call takes the request-scoped user client, so RLS
 * scopes the read and the write to the owner.
 */
import type { Tables, TablesUpdate, TypedSupabaseClient } from "@/shared/db/types";
import type { Inventor, InventorInput } from "@/features/filing/domain/types";

function toInventor(row: Tables<"project_inventors">): Inventor {
  return {
    id: row.id,
    project_id: row.project_id,
    legal_name: row.legal_name,
    residence: row.residence,
    mailing_address: row.mailing_address,
    citizenship: row.citizenship,
    ord: row.ord,
    created_at: row.created_at,
  };
}

export async function listInventors(
  supabase: TypedSupabaseClient,
  projectId: string,
): Promise<Inventor[]> {
  const { data, error } = await supabase
    .from("project_inventors")
    .select("*")
    .eq("project_id", projectId)
    .order("ord", { ascending: true });
  if (error) throw new Error(`load inventors: ${error.message}`);
  return (data ?? []).map(toInventor);
}

/**
 * Replace-all: delete the existing set, then insert the new ordered rows. The ADS names the
 * inventors as an ordered list, so a partial update would leave the order ambiguous.
 * Returns the first error message, or null on success.
 */
export async function replaceInventors(
  supabase: TypedSupabaseClient,
  projectId: string,
  rows: InventorInput[],
): Promise<string | null> {
  const { error: delErr } = await supabase
    .from("project_inventors")
    .delete()
    .eq("project_id", projectId);
  if (delErr) return delErr.message;

  if (rows.length > 0) {
    const { error: insErr } = await supabase.from("project_inventors").insert(
      rows.map((i, idx) => ({
        ...i,
        project_id: projectId,
        ord: idx,
      })),
    );
    if (insErr) return insErr.message;
  }
  return null;
}

/** Patch the applicant/entity columns that live on the project row. */
export async function updateApplicant(
  supabase: TypedSupabaseClient,
  projectId: string,
  patch: TablesUpdate<"projects">,
): Promise<string | null> {
  const { error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", projectId);
  return error ? error.message : null;
}
