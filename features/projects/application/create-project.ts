import "server-only";

/**
 * Create a matter. Input is validated before the viewer is loaded, so an empty name comes
 * back as a message rather than as a redirect. RLS scopes the insert to the signed-in user.
 */
import { requireViewer } from "@/shared/auth/require-viewer";
import { logAudit } from "@/shared/audit/log";
import { insertProject } from "@/features/projects/infrastructure/project-repository";
import {
  PATENT_TYPES,
  type PatentType,
} from "@/features/projects/domain/sections";

export type CreateProjectInput = {
  name: string;
  patentType: PatentType;
  clientName?: string;
  matterNo?: string;
};

export type CreateProjectDeps = {
  requireViewer: typeof requireViewer;
  insertProject: typeof insertProject;
  logAudit: typeof logAudit;
};

const defaultDeps: CreateProjectDeps = { requireViewer, insertProject, logAudit };

export async function createProject(
  input: CreateProjectInput,
  deps: CreateProjectDeps = defaultDeps,
): Promise<{ id: string } | { error: string }> {
  const name = input.name?.trim();
  if (!name) return { error: "Name is required." };
  const patentType = PATENT_TYPES.includes(input.patentType)
    ? input.patentType
    : "utility";
  const clientName = input.clientName?.trim() || null;
  const matterNo = input.matterNo?.trim() || null;

  const { supabase, user } = await deps.requireViewer();
  const created = await deps.insertProject(supabase, {
    userId: user.id,
    name,
    patentType,
    clientName,
    matterNo,
  });
  if ("error" in created) return created;

  await deps.logAudit(supabase, {
    userId: user.id,
    action: "project_created",
    projectId: created.id,
    detail: {
      name,
      patent_type: patentType,
      client_name: clientName,
      matter_no: matterNo,
    },
  });
  return { id: created.id };
}
