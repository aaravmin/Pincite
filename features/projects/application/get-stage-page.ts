import "server-only";

/**
 * The stage screen model: the detected stage (with the signals behind it, so the engine is
 * never a black box) plus the lifecycle actions for the declared status, with their MPEP
 * pins validated against the corpus.
 */
import { getProjectSnapshot } from "@/features/projects/application/get-project-snapshot";
import { resolveActionPins } from "@/features/projects/application/resolve-lifecycle-pins";
import { detectStage, type StageResult } from "@/features/projects/domain/stage";
import {
  lifecycleActions,
  type LifecycleAction,
} from "@/features/projects/domain/lifecycle";
import { SECTION_KEYS } from "@/features/projects/domain/sections";
import type { Project } from "@/features/projects/domain/types";

export type StagePageModel = {
  project: Project;
  stage: StageResult;
  actions: LifecycleAction[];
};

export async function getStagePage(
  projectId: string,
): Promise<StagePageModel | null> {
  const snapshot = await getProjectSnapshot(projectId);
  if (!snapshot) return null;
  const { project, sections } = snapshot;

  const filled = SECTION_KEYS.filter((k) => sections[k].trim().length > 0);
  const stage = detectStage({
    filled,
    declared_status: project.declared_status,
    application_number: project.application_number,
    filing_date: project.filing_date,
    patent_type: project.patent_type,
  });
  const actions = await resolveActionPins(
    lifecycleActions(project.declared_status, project.patent_type),
  );

  return { project, stage, actions };
}
