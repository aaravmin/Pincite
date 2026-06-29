/**
 * Read-side loaders for projects/sections/versions. Plain async functions called from
 * Server Components (not "use server" actions). RLS scopes every query to the owner.
 */
import { createClient } from "@/lib/supabase/server";
import {
  ADVANCED_SECTION_KEYS,
  filingCompleteness,
  type SectionKey,
} from "@/lib/projects/sections";
import type { Project, ProjectVersion } from "@/lib/projects/types";
import { detectStage } from "@/lib/stage/detect";

export type DashboardProject = Project & {
  completeness: number;
  versionCount: number;
  stage: string;
  openReds: number;
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
  const [
    { data: sections },
    { data: versions },
    { data: findingsRows },
    { data: disclosure },
    { data: inventors },
    { data: declarations },
  ] = await Promise.all([
    supabase
      .from("project_sections")
      .select("project_id, section_key, word_count")
      .in("project_id", ids),
    supabase.from("project_versions").select("project_id").in("project_id", ids),
    supabase.from("findings").select("project_id, severity").in("project_id", ids),
    supabase
      .from("project_disclosure")
      .select("project_id, problem_solved, how_it_works")
      .in("project_id", ids),
    supabase.from("project_inventors").select("project_id").in("project_id", ids),
    supabase.from("project_declarations").select("project_id").in("project_id", ids),
  ]);

  // filled = required sections with any content (drives stage detection).
  // words = per-section word counts (drives the depth-weighted completeness).
  const filled = new Map<string, Set<string>>();
  const words = new Map<string, Record<string, number>>();
  for (const s of sections ?? []) {
    const wc = s.word_count ?? 0;
    const wm = words.get(s.project_id) ?? {};
    wm[s.section_key] = wc;
    words.set(s.project_id, wm);
    if (wc <= 0) continue;
    if (ADVANCED_SECTION_KEYS.has(s.section_key as SectionKey)) continue;
    const set = filled.get(s.project_id) ?? new Set<string>();
    set.add(s.section_key);
    filled.set(s.project_id, set);
  }
  const versionCount = new Map<string, number>();
  for (const v of versions ?? []) {
    versionCount.set(v.project_id, (versionCount.get(v.project_id) ?? 0) + 1);
  }
  const reds = new Map<string, number>();
  for (const r of findingsRows ?? []) {
    if (r.severity === "violation")
      reds.set(r.project_id, (reds.get(r.project_id) ?? 0) + 1);
  }
  const hasDisclosure = new Set<string>();
  for (const d of disclosure ?? []) {
    if (
      String(d.problem_solved ?? "").trim() ||
      String(d.how_it_works ?? "").trim()
    ) {
      hasDisclosure.add(d.project_id);
    }
  }
  const inventorCount = new Map<string, number>();
  for (const r of inventors ?? []) {
    inventorCount.set(r.project_id, (inventorCount.get(r.project_id) ?? 0) + 1);
  }
  const signedCount = new Map<string, number>();
  for (const r of declarations ?? []) {
    signedCount.set(r.project_id, (signedCount.get(r.project_id) ?? 0) + 1);
  }

  return projects.map((p) => {
    const proj = p as Project;
    return {
      ...proj,
      completeness: filingCompleteness({
        sectionWords: words.get(p.id) ?? {},
        hasDisclosure: hasDisclosure.has(p.id),
        inventorCount: inventorCount.get(p.id) ?? 0,
        signedCount: signedCount.get(p.id) ?? 0,
      }),
      versionCount: versionCount.get(p.id) ?? 0,
      openReds: reds.get(p.id) ?? 0,
      stage: detectStage({
        filled: [...(filled.get(p.id) ?? new Set<string>())],
        declared_status: proj.declared_status,
        application_number: proj.application_number,
        filing_date: proj.filing_date,
        patent_type: proj.patent_type,
      }).label,
    };
  });
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
