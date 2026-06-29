/**
 * Load a full MPEP section from the local corpus (roadmap §4.5 "load" step). The
 * evidence pane renders full_text and highlights offsets into it. No live USPTO
 * fetching at request time - the corpus is the versioned local copy.
 */
import { createClient } from "@/lib/supabase/server";

export type MpepSection = {
  section_number: string;
  title: string | null;
  chapter: string | null;
  revision_tag: string | null;
  edition: string;
  source_url: string;
  full_text: string;
};

const COLUMNS =
  "section_number, title, chapter, revision_tag, edition, source_url, full_text";

export async function loadSection(
  sectionNumber: string,
): Promise<MpepSection | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mpep_sections")
    .select(COLUMNS)
    .eq("section_number", sectionNumber)
    .maybeSingle();
  return (data as MpepSection) ?? null;
}
