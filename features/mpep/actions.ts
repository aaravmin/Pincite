"use server";

/** Server actions for the MPEP feature. Authenticate, validate, call one use case. */
import { getViewer } from "@/shared/auth/require-viewer";
import { askMpepQuestion } from "@/features/mpep/application/ask";
import type { AskResult } from "@/features/mpep/domain/types";

export async function askMpep(
  query: string,
): Promise<AskResult | { error: string }> {
  const q = query?.trim();
  if (!q) return { error: "Enter a question or an MPEP section number." };

  // Returns an error rather than redirecting: Ask is a panel inside a screen, and a
  // signed-out call should say so rather than navigate the user away.
  const viewer = await getViewer();
  if (!viewer) return { error: "Not signed in." };

  return askMpepQuestion(viewer.supabase, q);
}
