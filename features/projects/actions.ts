"use server";

/**
 * The project mutations, as server actions. Each one is deliberately thin: call a single
 * application operation, revalidate the paths the change is visible on, and hand back a
 * serializable result. Authorization, validation, persistence, and audit logging live in the
 * application layer, where they can be tested without Next.js.
 */
import { revalidatePath } from "next/cache";
import {
  createProject as createProjectOperation,
  type CreateProjectInput,
} from "@/features/projects/application/create-project";
import { deleteProject as deleteProjectOperation } from "@/features/projects/application/delete-project";
import {
  updateProjectStatus as updateProjectStatusOperation,
  type UpdateProjectStatusInput,
} from "@/features/projects/application/update-status";
import {
  saveSection as saveSectionOperation,
  type SaveSectionInput,
} from "@/features/projects/application/save-section";
import { saveVersion as saveVersionOperation } from "@/features/projects/application/save-version";
import { reopenVersion } from "@/features/projects/application/reopen-version";
import {
  listProjectVersions as listProjectVersionsOperation,
  type VersionSummary,
} from "@/features/projects/application/list-versions";
import { listMatters as listMattersOperation } from "@/features/projects/application/list-matters";

export async function createProject(
  input: CreateProjectInput,
): Promise<{ id: string } | { error: string }> {
  const result = await createProjectOperation(input);
  if ("id" in result) revalidatePath("/dashboard");
  return result;
}

export async function deleteProject(input: {
  projectId: string;
}): Promise<{ ok: true } | { error: string }> {
  const result = await deleteProjectOperation(input);
  if ("ok" in result) revalidatePath("/dashboard");
  return result;
}

export async function updateProjectStatus(
  input: UpdateProjectStatusInput,
): Promise<{ ok: true } | { error: string }> {
  const result = await updateProjectStatusOperation(input);
  if ("ok" in result) {
    revalidatePath(`/projects/${input.projectId}/stage`);
    revalidatePath("/dashboard");
  }
  return result;
}

export async function saveSection(
  input: SaveSectionInput,
): Promise<
  { ok: true; savedAt: string; wordCount: number } | { error: string }
> {
  return saveSectionOperation(input);
}

export async function saveVersion(input: {
  projectId: string;
  label?: string;
}): Promise<{ id: string } | { error: string }> {
  const result = await saveVersionOperation(input);
  if ("id" in result) {
    revalidatePath(`/projects/${input.projectId}`);
    revalidatePath(`/projects/${input.projectId}/versions`);
  }
  return result;
}

export async function restoreVersion(input: {
  projectId: string;
  versionId: string;
}): Promise<{ id: string } | { error: string }> {
  const result = await reopenVersion({ ...input, mode: "restore" });
  if ("id" in result) {
    revalidatePath(`/projects/${input.projectId}`);
    revalidatePath(`/projects/${input.projectId}/versions`);
  }
  return result;
}

export async function branchVersion(input: {
  projectId: string;
  versionId: string;
}): Promise<{ id: string } | { error: string }> {
  const result = await reopenVersion({ ...input, mode: "branch" });
  if ("id" in result) {
    revalidatePath(`/projects/${input.projectId}`);
    revalidatePath(`/projects/${input.projectId}/versions`);
  }
  return result;
}

export async function listProjectVersions(
  projectId: string,
): Promise<VersionSummary[]> {
  return listProjectVersionsOperation(projectId);
}

export async function listMatters(): Promise<{ id: string; name: string }[]> {
  return listMattersOperation();
}
