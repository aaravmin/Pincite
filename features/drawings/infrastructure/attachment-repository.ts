import "server-only";

/**
 * Persistence for uploaded attachments.
 *
 * READS AND OWNERSHIP go through the request-scoped user client, so RLS is the boundary:
 * a row that is not the caller's simply does not come back.
 *
 * TWO WRITES USE THE ADMIN CLIENT ON PURPOSE. `project_attachments` has no row-UPDATE RLS
 * policy, so the SSR user client cannot patch a row. Ownership is verified first with the
 * user client (the application layer does this before calling either function), and only
 * then is the update issued with the service-role client - the same "verify with the user
 * client, act with the admin client" pattern Storage requires (see CLAUDE.md).
 */
import { createAdminClient } from "@/shared/db/admin";
import type { TablesInsert, TypedSupabaseClient } from "@/shared/db/types";
import {
  toAttachment,
  type Attachment,
  type DrawingReview,
} from "@/features/drawings/domain/types";

/**
 * Does the caller see this project at all? An upload targets a project row, so the target is
 * confirmed with the USER client before any Storage write - RLS returns no row for someone
 * else's matter. Deliberately a one-column probe rather than a full project load: the upload
 * path needs the answer, not the record.
 */
export async function projectIsVisible(
  supabase: TypedSupabaseClient,
  projectId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();
  return Boolean(data);
}

export async function listAttachments(
  supabase: TypedSupabaseClient,
  projectId: string,
): Promise<Attachment[]> {
  const { data, error } = await supabase
    .from("project_attachments")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .order("page_index", { ascending: true, nullsFirst: true });
  if (error) throw new Error(`load attachments: ${error.message}`);
  return (data ?? []).map(toAttachment);
}

/**
 * The ownership check every drawing operation starts with: the row comes back only when it
 * belongs to a project the caller can see.
 */
export async function findAttachment(
  supabase: TypedSupabaseClient,
  projectId: string,
  attachmentId: string,
): Promise<Attachment | null> {
  const { data } = await supabase
    .from("project_attachments")
    .select("*")
    .eq("id", attachmentId)
    .eq("project_id", projectId)
    .maybeSingle();
  return data ? toAttachment(data) : null;
}

/**
 * How many OTHER rows point at the same storage object. The per-page rows of a multi-page
 * PDF share one object, so the bytes may only be removed when this is the last row.
 */
export async function countStoragePathSiblings(
  supabase: TypedSupabaseClient,
  projectId: string,
  storagePath: string,
  excludeAttachmentId: string,
): Promise<number> {
  const { count } = await supabase
    .from("project_attachments")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("storage_path", storagePath)
    .neq("id", excludeAttachmentId);
  return count ?? 0;
}

export async function insertAttachments(
  supabase: TypedSupabaseClient,
  rows: TablesInsert<"project_attachments">[],
): Promise<{ rows: Attachment[] } | { error: string }> {
  const { data, error } = await supabase
    .from("project_attachments")
    .insert(rows)
    .select("*");
  if (error || !data?.length) {
    return { error: error?.message ?? "Could not record attachment." };
  }
  return { rows: data.map(toAttachment) };
}

export async function deleteAttachmentRow(
  supabase: TypedSupabaseClient,
  attachmentId: string,
): Promise<string | null> {
  const { error } = await supabase
    .from("project_attachments")
    .delete()
    .eq("id", attachmentId);
  return error ? error.message : null;
}

/** Persist a vision review so the issues flagged on a figure survive a page leave. */
export async function updateAttachmentAnalysis(
  projectId: string,
  attachmentId: string,
  analysis: DrawingReview,
): Promise<void> {
  await createAdminClient()
    .from("project_attachments")
    .update({ analysis })
    .eq("id", attachmentId)
    .eq("project_id", projectId);
}

/** Set (or clear, with null) a figure's standard view. */
export async function updateAttachmentView(
  projectId: string,
  attachmentId: string,
  view: string | null,
): Promise<void> {
  await createAdminClient()
    .from("project_attachments")
    .update({ view })
    .eq("id", attachmentId)
    .eq("project_id", projectId);
}
