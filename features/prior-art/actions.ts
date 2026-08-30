"use server";

/**
 * Prior-art server actions (roadmap §4.6). Each one authenticates, calls exactly one
 * application operation, revalidates the results screen, and returns a serializable result.
 */
import { revalidatePath } from "next/cache";
import { getViewer, requireViewer } from "@/shared/auth/require-viewer";
import { runSearch } from "@/features/prior-art/application/run-search";
import {
  compareCandidate,
  type CompareInput,
} from "@/features/prior-art/application/compare-candidate";
import { lookupPatent } from "@/features/prior-art/application/lookup-patent";
import type { PatentDetails } from "@/features/prior-art/domain/types";

export async function runPriorArtSearch(
  projectId: string,
): Promise<
  | { ok: true; count: number; scanGB: number; source: "bigquery" | "google_patents" }
  | { error: string }
> {
  const { supabase, user } = await requireViewer();
  const result = await runSearch(supabase, user, projectId);
  if ("ok" in result) revalidatePath(`/projects/${projectId}/prior-art`);
  return result;
}

export async function compareAgainstCandidate(
  input: CompareInput,
): Promise<{ ok: true; count: number } | { error: string }> {
  const { supabase, user } = await requireViewer();
  const result = await compareCandidate(supabase, user, input);
  if ("ok" in result) revalidatePath(`/projects/${input.projectId}/prior-art`);
  return result;
}

export async function loadPatentDetails(
  patentNumber: string,
): Promise<{ ok: true; details: PatentDetails } | { error: string }> {
  // Returns an error rather than redirecting: this runs from the results client, where a
  // signed-out call should surface a message, not navigate the user away mid-comparison.
  const viewer = await getViewer();
  if (!viewer) return { error: "Not signed in." };
  return lookupPatent(viewer.supabase, patentNumber);
}
