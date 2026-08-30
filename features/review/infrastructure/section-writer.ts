import "server-only";

/**
 * The one write into `project_sections` the review feature makes: applying an accepted
 * auto-fix. It is the same upsert the draft editor performs (keyed on project + section, with
 * the word count kept in step), so a fix and a hand edit leave the row in the same shape.
 * RLS scopes the table to the owner.
 */
import type { TypedSupabaseClient } from "@/shared/db/types";
import {
  wordCount,
  type SectionKey,
} from "@/features/projects/domain/sections";

export async function upsertSectionContent(
  supabase: TypedSupabaseClient,
  input: { projectId: string; sectionKey: SectionKey; content: string },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("project_sections").upsert(
    {
      project_id: input.projectId,
      section_key: input.sectionKey,
      content: input.content,
      word_count: wordCount(input.content),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "project_id,section_key" },
  );
  return { error: error?.message ?? null };
}
