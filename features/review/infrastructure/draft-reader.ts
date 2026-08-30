import "server-only";

/**
 * The draft text the validators run against, read fresh.
 *
 * The read-only screens go through the request-cached project snapshot, but the validator
 * runs must NOT: applying an auto-fix writes a section and then immediately recomputes
 * findings inside the same server action, and a request-cached loader would hand the
 * recompute the pre-fix text and report the issue as still present. So this reads the two
 * rows it needs directly, every time, with the caller's client (RLS scopes it to the owner).
 */
import type { TypedSupabaseClient } from "@/shared/db/types";
import type { PatentType } from "@/features/projects/domain/sections";

export type ReviewDraft = {
  sections: Record<string, string>;
  patentType: PatentType;
};

export async function loadDraftForReview(
  supabase: TypedSupabaseClient,
  projectId: string,
): Promise<ReviewDraft> {
  const [sectionRows, projectRow] = await Promise.all([
    supabase
      .from("project_sections")
      .select("section_key, content")
      .eq("project_id", projectId),
    supabase
      .from("projects")
      .select("patent_type")
      .eq("id", projectId)
      .maybeSingle(),
  ]);
  if (sectionRows.error) {
    throw new Error(`load sections: ${sectionRows.error.message}`);
  }
  if (projectRow.error) {
    throw new Error(`load project: ${projectRow.error.message}`);
  }

  const sections: Record<string, string> = {};
  for (const row of sectionRows.data ?? []) {
    sections[row.section_key] = row.content ?? "";
  }
  // A matter the viewer cannot see returns no row; "utility" is the default draft type, and
  // RLS will reject the write that follows anyway.
  return { sections, patentType: projectRow.data?.patent_type ?? "utility" };
}
