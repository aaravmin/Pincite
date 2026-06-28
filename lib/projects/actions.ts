"use server";

/**
 * Phase 1 mutations. Each enforces auth (RLS is the real boundary), records an audit
 * row, and revalidates the affected paths. Saves are append-only: saveVersion always
 * inserts a new immutable snapshot; restore/branch reopen an old snapshot into a NEW
 * version that links back to its source — history is never overwritten.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import {
  SECTION_KEYS,
  PATENT_TYPES,
  PROJECT_STATUSES,
  wordCount,
  type SectionKey,
  type PatentType,
  type ProjectStatus,
} from "@/lib/projects/sections";
import type { VersionSnapshot } from "@/lib/projects/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

type SupabaseFromRequireUser = Awaited<ReturnType<typeof requireUser>>["supabase"];

export async function createProject(input: {
  name: string;
  patentType: PatentType;
  clientName?: string;
  matterNo?: string;
}): Promise<{ id: string } | { error: string }> {
  const name = input.name?.trim();
  if (!name) return { error: "Name is required." };
  const patentType = PATENT_TYPES.includes(input.patentType)
    ? input.patentType
    : "utility";
  const clientName = input.clientName?.trim() || null;
  const matterNo = input.matterNo?.trim() || null;

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name,
      patent_type: patentType,
      client_name: clientName,
      matter_no: matterNo,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { error: error?.message ?? "Could not create project." };
  }

  await logAudit(supabase, {
    userId: user.id,
    action: "project_created",
    projectId: data.id,
    detail: { name, patent_type: patentType, client_name: clientName, matter_no: matterNo },
  });
  revalidatePath("/dashboard");
  return { id: data.id };
}

export async function updateProjectStatus(input: {
  projectId: string;
  declared_status: ProjectStatus;
  application_number?: string;
  filing_date?: string | null;
}): Promise<{ ok: true } | { error: string }> {
  if (!PROJECT_STATUSES.includes(input.declared_status)) {
    return { error: "Unknown status." };
  }
  const { supabase, user } = await requireUser();
  const patch: Record<string, unknown> = {
    declared_status: input.declared_status,
  };
  if (input.application_number !== undefined) {
    patch.application_number = input.application_number.trim() || null;
  }
  if (input.filing_date !== undefined) {
    patch.filing_date = input.filing_date || null;
  }

  const { error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", input.projectId);
  if (error) return { error: error.message };

  await logAudit(supabase, {
    userId: user.id,
    action: "project_status_changed",
    projectId: input.projectId,
    detail: patch,
  });
  revalidatePath(`/projects/${input.projectId}/stage`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function saveSection(input: {
  projectId: string;
  sectionKey: SectionKey;
  content: string;
}): Promise<
  { ok: true; savedAt: string; wordCount: number } | { error: string }
> {
  if (!SECTION_KEYS.includes(input.sectionKey)) {
    return { error: "Unknown section." };
  }
  const { supabase, user } = await requireUser();

  const { data: prev } = await supabase
    .from("project_sections")
    .select("word_count")
    .eq("project_id", input.projectId)
    .eq("section_key", input.sectionKey)
    .maybeSingle();

  const wc = wordCount(input.content);
  const now = new Date().toISOString();
  const { error } = await supabase.from("project_sections").upsert(
    {
      project_id: input.projectId,
      section_key: input.sectionKey,
      content: input.content,
      word_count: wc,
      updated_at: now,
    },
    { onConflict: "project_id,section_key" },
  );
  if (error) return { error: error.message };

  // Bump the project so the dashboard "last edited" reflects section edits too.
  await supabase.from("projects").update({ updated_at: now }).eq("id", input.projectId);

  await logAudit(supabase, {
    userId: user.id,
    action: "section_edited",
    projectId: input.projectId,
    detail: {
      section_key: input.sectionKey,
      from_words: prev?.word_count ?? 0,
      to_words: wc,
    },
  });

  return { ok: true, savedAt: now, wordCount: wc };
}

async function buildSnapshot(
  supabase: SupabaseFromRequireUser,
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
    sectionMap[row.section_key as SectionKey] = row.content ?? "";
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

export async function saveVersion(input: {
  projectId: string;
  label?: string;
}): Promise<{ id: string } | { error: string }> {
  const { supabase, user } = await requireUser();
  const snapshot = await buildSnapshot(supabase, input.projectId);
  const { data, error } = await supabase
    .from("project_versions")
    .insert({
      project_id: input.projectId,
      user_id: user.id,
      label: input.label?.trim() || null,
      snapshot,
      parent_version_id: null,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { error: error?.message ?? "Could not save version." };
  }

  await logAudit(supabase, {
    userId: user.id,
    action: "version_saved",
    projectId: input.projectId,
    versionId: data.id,
    detail: { label: input.label?.trim() || null },
  });
  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/projects/${input.projectId}/versions`);
  return { id: data.id };
}

// Shared core for restore + branch: load an old snapshot into the working draft and
// append a NEW immutable version linked to its source. Never deletes newer history.
async function reopenVersion(
  projectId: string,
  sourceVersionId: string,
  mode: "restore" | "branch",
): Promise<{ id: string } | { error: string }> {
  const { supabase, user } = await requireUser();

  const { data: source, error: loadErr } = await supabase
    .from("project_versions")
    .select("id, label, snapshot, project_id, created_at")
    .eq("id", sourceVersionId)
    .maybeSingle();
  if (loadErr) return { error: loadErr.message };
  if (!source || source.project_id !== projectId) {
    return { error: "Version not found." };
  }

  const snapshot = source.snapshot as VersionSnapshot;
  const now = new Date().toISOString();

  const rows = SECTION_KEYS.filter((k) => k in snapshot.sections).map((k) => ({
    project_id: projectId,
    section_key: k,
    content: snapshot.sections[k] ?? "",
    word_count: wordCount(snapshot.sections[k] ?? ""),
    updated_at: now,
  }));
  if (rows.length > 0) {
    const { error: upErr } = await supabase
      .from("project_sections")
      .upsert(rows, { onConflict: "project_id,section_key" });
    if (upErr) return { error: upErr.message };
  }
  await supabase.from("projects").update({ updated_at: now }).eq("id", projectId);

  const sourceName =
    source.label ||
    new Date(source.created_at).toISOString().slice(0, 16).replace("T", " ");
  const label =
    mode === "restore" ? `Restored from ${sourceName}` : `Branch from ${sourceName}`;

  const { data: created, error: insErr } = await supabase
    .from("project_versions")
    .insert({
      project_id: projectId,
      user_id: user.id,
      label,
      snapshot,
      parent_version_id: sourceVersionId,
    })
    .select("id")
    .single();
  if (insErr || !created) {
    return { error: insErr?.message ?? "Could not reopen version." };
  }

  await logAudit(supabase, {
    userId: user.id,
    action: mode === "restore" ? "version_restored" : "version_branched",
    projectId,
    versionId: created.id,
    detail: { source_version_id: sourceVersionId, mode },
  });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/versions`);
  return { id: created.id };
}

export async function restoreVersion(input: {
  projectId: string;
  versionId: string;
}) {
  return reopenVersion(input.projectId, input.versionId, "restore");
}

export async function branchVersion(input: {
  projectId: string;
  versionId: string;
}) {
  return reopenVersion(input.projectId, input.versionId, "branch");
}
