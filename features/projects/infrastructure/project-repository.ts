import "server-only";

/**
 * Persistence for projects, their sections, and their version history. Every function takes
 * the caller's authenticated client, so RLS scopes each statement to the owner; nothing here
 * decides business rules or records audit events - that is the application layer's job.
 *
 * Read helpers throw on a database error (a broken read is not a user-correctable state).
 * Write helpers return `{ error }` instead, because the message is shown to the user by the
 * action that called them.
 */
import type { Tables, TablesUpdate, TypedSupabaseClient } from "@/shared/db/types";
import type { SectionKey } from "@/features/projects/domain/sections";
import type {
  ProjectVersion,
  VersionSnapshot,
} from "@/features/projects/domain/types";

export {
  loadProject as getProject,
  loadSections as getSections,
} from "@/features/projects/infrastructure/snapshot-repository";

/** One section as it is written back: the row shape the upsert takes. */
export type SectionUpsert = {
  project_id: string;
  section_key: SectionKey;
  content: string;
  word_count: number;
  updated_at: string;
};

function toVersion(row: Tables<"project_versions">): ProjectVersion {
  return {
    id: row.id,
    project_id: row.project_id,
    user_id: row.user_id,
    label: row.label,
    // `snapshot` is a jsonb column; only saveVersion/reopenVersion write it, and they write
    // this shape.
    snapshot: row.snapshot as unknown as VersionSnapshot,
    parent_version_id: row.parent_version_id,
    created_at: row.created_at,
  };
}

/** The full version history for a matter, newest first. */
export async function listVersions(
  supabase: TypedSupabaseClient,
  projectId: string,
): Promise<ProjectVersion[]> {
  const { data, error } = await supabase
    .from("project_versions")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`load versions: ${error.message}`);
  return (data ?? []).map(toVersion);
}

/** Just enough of each save for the dashboard "open a save" menu, newest first. */
export async function listVersionSummaries(
  supabase: TypedSupabaseClient,
  projectId: string,
): Promise<{ id: string; label: string | null; created_at: string }[]> {
  const { data } = await supabase
    .from("project_versions")
    .select("id, label, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** The source of a reopened save: the snapshot plus the fields its new label is built from. */
export type VersionSource = {
  id: string;
  project_id: string;
  label: string | null;
  created_at: string;
  snapshot: VersionSnapshot;
};

/** One saved version. `{ version: null }` means no such version, which is not an error. */
export async function loadVersion(
  supabase: TypedSupabaseClient,
  versionId: string,
): Promise<{ version: VersionSource | null } | { error: string }> {
  const { data, error } = await supabase
    .from("project_versions")
    .select("id, label, snapshot, project_id, created_at")
    .eq("id", versionId)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { version: null };
  return {
    version: {
      id: data.id,
      project_id: data.project_id,
      label: data.label,
      created_at: data.created_at,
      snapshot: data.snapshot as unknown as VersionSnapshot,
    },
  };
}

export async function insertProject(
  supabase: TypedSupabaseClient,
  input: {
    userId: string;
    name: string;
    patentType: Tables<"projects">["patent_type"];
    clientName: string | null;
    matterNo: string | null;
  },
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: input.userId,
      name: input.name,
      patent_type: input.patentType,
      client_name: input.clientName,
      matter_no: input.matterNo,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { error: error?.message ?? "Could not create project." };
  }
  return { id: data.id };
}

/** The project's name, for the audit detail written when it is deleted. */
export async function getProjectName(
  supabase: TypedSupabaseClient,
  projectId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .maybeSingle();
  return data?.name ?? null;
}

export async function deleteProject(
  supabase: TypedSupabaseClient,
  projectId: string,
): Promise<{ ok: true } | { error: string }> {
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  return error ? { error: error.message } : { ok: true };
}

export async function updateProject(
  supabase: TypedSupabaseClient,
  projectId: string,
  patch: TablesUpdate<"projects">,
): Promise<{ ok: true } | { error: string }> {
  const { error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", projectId);
  return error ? { error: error.message } : { ok: true };
}

/** Bump `updated_at` so "last edited" reflects section edits too. */
export async function touchProject(
  supabase: TypedSupabaseClient,
  projectId: string,
  at: string,
): Promise<void> {
  await supabase.from("projects").update({ updated_at: at }).eq("id", projectId);
}

/** The stored word count of one section before it is overwritten (for the audit detail). */
export async function getSectionWordCount(
  supabase: TypedSupabaseClient,
  projectId: string,
  sectionKey: SectionKey,
): Promise<number | null> {
  const { data } = await supabase
    .from("project_sections")
    .select("word_count")
    .eq("project_id", projectId)
    .eq("section_key", sectionKey)
    .maybeSingle();
  return data?.word_count ?? null;
}

export async function upsertSections(
  supabase: TypedSupabaseClient,
  rows: SectionUpsert[],
): Promise<{ ok: true } | { error: string }> {
  if (rows.length === 0) return { ok: true };
  const { error } = await supabase
    .from("project_sections")
    .upsert(rows, { onConflict: "project_id,section_key" });
  return error ? { error: error.message } : { ok: true };
}

/** The project fields and section text a version snapshot is built from. */
export async function loadSnapshotSource(
  supabase: TypedSupabaseClient,
  projectId: string,
): Promise<VersionSnapshot> {
  const [{ data: project }, { data: sections }] = await Promise.all([
    supabase
      .from("projects")
      .select("name, patent_type, declared_status, application_number, filing_date")
      .eq("id", projectId)
      .single(),
    supabase
      .from("project_sections")
      .select("section_key, content")
      .eq("project_id", projectId),
  ]);
  const sectionMap: VersionSnapshot["sections"] = {};
  for (const row of sections ?? []) {
    sectionMap[row.section_key] = row.content ?? "";
  }
  return {
    project: {
      name: project?.name ?? "",
      patent_type: project?.patent_type ?? "utility",
      declared_status: project?.declared_status ?? "drafting",
      application_number: project?.application_number ?? null,
      filing_date: project?.filing_date ?? null,
    },
    sections: sectionMap,
  };
}

export async function insertVersion(
  supabase: TypedSupabaseClient,
  input: {
    projectId: string;
    userId: string;
    label: string | null;
    snapshot: VersionSnapshot;
    parentVersionId: string | null;
  },
  fallbackError: string,
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase
    .from("project_versions")
    .insert({
      project_id: input.projectId,
      user_id: input.userId,
      label: input.label,
      // A snapshot is plain JSON data; the column is jsonb.
      snapshot: input.snapshot as unknown as Tables<"project_versions">["snapshot"],
      parent_version_id: input.parentVersionId,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? fallbackError };
  return { id: data.id };
}

/** How many similar public patents have been found for this matter. */
export async function countPriorArtMatches(
  supabase: TypedSupabaseClient,
  projectId: string,
): Promise<number> {
  const { data } = await supabase
    .from("prior_art_matches")
    .select("id")
    .eq("project_id", projectId);
  return (data ?? []).length;
}
