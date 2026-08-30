import "server-only";

/**
 * The dashboard read: one batched query per table for ALL of the viewer's matters, never one
 * query per project. This module loads rows and nothing else - the derived state (issue
 * count, completeness, stage, next step) is computed by
 * `features/projects/domain/dashboard-summary`, so a query module no longer imports the
 * validators or the stage engine.
 */
import type { TypedSupabaseClient } from "@/shared/db/types";
import type { SectionKey } from "@/features/projects/domain/sections";
import type { DashboardRow } from "@/features/projects/domain/dashboard-summary";
import { toProject } from "@/features/projects/infrastructure/snapshot-repository";

export async function loadDashboardRows(
  supabase: TypedSupabaseClient,
): Promise<DashboardRow[]> {
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
    { data: disclosure },
    { data: inventors },
    { data: declarationDocs },
  ] = await Promise.all([
    supabase
      .from("project_sections")
      .select("project_id, section_key, word_count, content")
      .in("project_id", ids),
    supabase.from("project_versions").select("project_id").in("project_id", ids),
    supabase
      .from("project_disclosure")
      .select("project_id, problem_solved, how_it_works")
      .in("project_id", ids),
    supabase.from("project_inventors").select("project_id").in("project_id", ids),
    // "Signed" = the inventor's hand-signed declaration document was uploaded (the operative
    // signature lives on that document, not on any in-app click).
    supabase
      .from("project_attachments")
      .select("project_id")
      .eq("kind", "declaration")
      .in("project_id", ids),
  ]);

  const words = new Map<string, Partial<Record<SectionKey, number>>>();
  const content = new Map<string, Record<string, string>>();
  for (const s of sections ?? []) {
    const wordMap = words.get(s.project_id) ?? {};
    wordMap[s.section_key] = s.word_count ?? 0;
    words.set(s.project_id, wordMap);
    const contentMap = content.get(s.project_id) ?? {};
    contentMap[s.section_key] = s.content ?? "";
    content.set(s.project_id, contentMap);
  }
  const versionCount = new Map<string, number>();
  for (const v of versions ?? []) {
    versionCount.set(v.project_id, (versionCount.get(v.project_id) ?? 0) + 1);
  }
  const hasDisclosure = new Set<string>();
  for (const d of disclosure ?? []) {
    if (d.problem_solved?.trim() || d.how_it_works?.trim()) {
      hasDisclosure.add(d.project_id);
    }
  }
  const inventorCount = new Map<string, number>();
  for (const r of inventors ?? []) {
    inventorCount.set(r.project_id, (inventorCount.get(r.project_id) ?? 0) + 1);
  }
  const hasSignedDecl = new Set<string>();
  for (const r of declarationDocs ?? []) hasSignedDecl.add(r.project_id);

  return projects.map((project) => ({
    project: toProject(project),
    sectionWords: words.get(project.id) ?? {},
    sectionContent: content.get(project.id) ?? {},
    versionCount: versionCount.get(project.id) ?? 0,
    hasDisclosure: hasDisclosure.has(project.id),
    inventorCount: inventorCount.get(project.id) ?? 0,
    hasSignedDeclaration: hasSignedDecl.has(project.id),
  }));
}
