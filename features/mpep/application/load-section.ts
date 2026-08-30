import "server-only";

/**
 * Load a full MPEP section from the local corpus (the "load" step). The evidence
 * pane renders full_text and highlights offsets into it. No live USPTO fetching at request
 * time - the corpus is the versioned local copy.
 */
import { createClient } from "@/shared/db/server";
import { loadSectionRow } from "@/features/mpep/infrastructure/corpus-repository";
import type { MpepSection } from "@/features/mpep/domain/types";

export type { MpepSection };

export async function loadSection(
  sectionNumber: string,
): Promise<MpepSection | null> {
  const supabase = await createClient();
  return loadSectionRow(supabase, sectionNumber);
}
