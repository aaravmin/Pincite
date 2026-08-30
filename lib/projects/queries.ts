/**
 * Transitional compatibility layer. The reads now live in
 * `features/projects/infrastructure/*` and take the caller's authenticated client; the
 * canonical loader for a project screen is
 * `features/projects/application/get-project-snapshot`. These wrappers keep the old
 * client-creating signatures working until every call site is moved.
 */
import { createClient } from "@/shared/db/server";
import {
  loadProject,
  loadSections,
} from "@/features/projects/infrastructure/snapshot-repository";
import { listVersions as listProjectVersionRows } from "@/features/projects/infrastructure/project-repository";
import type { Project, ProjectVersion } from "@/features/projects/domain/types";

export { getDashboard as getDashboardProjects } from "@/features/projects/application/get-dashboard";
export type { DashboardProject } from "@/features/projects/domain/dashboard-summary";

export async function getProject(id: string): Promise<Project | null> {
  return loadProject(await createClient(), id);
}

/** section_key -> content for one project (missing sections default to ""). */
export async function getSectionContent(
  projectId: string,
): Promise<Record<string, string>> {
  return loadSections(await createClient(), projectId);
}

export async function listVersions(
  projectId: string,
): Promise<ProjectVersion[]> {
  return listProjectVersionRows(await createClient(), projectId);
}
