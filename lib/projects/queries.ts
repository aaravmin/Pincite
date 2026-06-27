/**
 * Read-side loaders for projects/sections/versions. Plain async functions called from
 * Server Components (not "use server" actions). RLS scopes every query to the owner.
 */
import { createClient } from "@/lib/supabase/server";
import {
  SECTION_KEYS,
  ADVANCED_SECTION_KEYS,
  type SectionKey,
} from "@/lib/projects/sections";
import type { Project, ProjectVersion } from "@/lib/projects/types";

export type DashboardProject = Project & {
  completeness: number;
  versionCount: number;
};

export async function getDashboardProjects(): Promise<DashboardProject[]> {
  const supabase = await createClient();
  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`load projects: ${error.message}`);
  if (!projects || projects.length === 0) return [];

  const ids = projects.map((p) => p.id);
  const [{ data: sections }, { data: versions }] = await Promise.all([
    supabase
      .from("project_sections")
      .select("project_id, section_key, word_count")
      .in("project_id", ids),
    supabase
      .from("project_versions")
      .select("project_id")
      .in("project_id", ids),
  ]);

  const requiredCount = SECTION_KEYS.filter(
    (k) => !ADVANCED_SECTION_KEYS.has(k),
  ).length;

  const filled = new Map<string, Set<string>>();
  for (const s of sections ?? []) {
    if ((s.word_count ?? 0) <= 0) continue;
    if (ADVANCED_SECTION_KEYS.has(s.section_key as SectionKey)) continue;
    const set = filled.get(s.project_id) ?? new Set<string>();
    set.add(s.section_key);
    filled.set(s.project_id, set);
  }
  const versionCount = new Map<string, number>();
  for (const v of versions ?? []) {
    versionCount.set(v.project_id, (versionCount.get(v.project_id) ?? 0) + 1);
  }

  return projects.map((p) => ({
    ...(p as Project),
    completeness: Math.round(
      ((filled.get(p.id)?.size ?? 0) / requiredCount) * 100,
    ),
    versionCount: versionCount.get(p.id) ?? 0,
  }));
}

export async function getProject(id: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`load project: ${error.message}`);
  return (data as Project) ?? null;
}

/** section_key -> content for one project (missing sections default to ""). */
export async function getSectionContent(
  projectId: string,
): Promise<Record<string, string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_sections")
    .select("section_key, content")
    .eq("project_id", projectId);
  if (error) throw new Error(`load sections: ${error.message}`);
  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.section_key] = row.content ?? "";
  return map;
}

export async function listVersions(
  projectId: string,
): Promise<ProjectVersion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_versions")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`load versions: ${error.message}`);
  return (data as ProjectVersion[]) ?? [];
}
