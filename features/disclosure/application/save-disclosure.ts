import "server-only";

/** Persist the invention disclosure. One row per project, upserted; every field trimmed. */
import { logAudit } from "@/shared/audit/log";
import type { TablesInsert, TypedSupabaseClient } from "@/shared/db/types";
import {
  DISCLOSURE_FIELDS,
  type Disclosure,
} from "@/features/disclosure/domain/types";
import { upsertDisclosure } from "@/features/disclosure/infrastructure/disclosure-repository";

export type SaveDisclosureInput = {
  supabase: TypedSupabaseClient;
  userId: string;
  projectId: string;
  values: Disclosure;
};

export type SaveDisclosureDeps = {
  upsertDisclosure: typeof upsertDisclosure;
  logAudit: typeof logAudit;
  now: () => string;
};

const defaultDeps: SaveDisclosureDeps = {
  upsertDisclosure,
  logAudit,
  now: () => new Date().toISOString(),
};

export async function saveDisclosure(
  input: SaveDisclosureInput,
  deps: SaveDisclosureDeps = defaultDeps,
): Promise<{ ok: true } | { error: string }> {
  const row: TablesInsert<"project_disclosure"> = {
    project_id: input.projectId,
    updated_at: deps.now(),
  };
  for (const f of DISCLOSURE_FIELDS) {
    row[f.key] = (input.values[f.key] ?? "").trim();
  }

  const error = await deps.upsertDisclosure(input.supabase, row);
  if (error) return { error };

  await deps.logAudit(input.supabase, {
    userId: input.userId,
    action: "disclosure_saved",
    projectId: input.projectId,
  });
  return { ok: true };
}
