import "server-only";

/**
 * Save one section of the draft (the autosave path). The section text is stored as raw plain
 * text so the character offsets findings point at stay stable. The audit detail records the
 * word count before and after, which is how the history shows real editing rather than "a
 * save happened".
 */
import { requireViewer } from "@/shared/auth/require-viewer";
import { logAudit } from "@/shared/audit/log";
import {
  getSectionWordCount,
  touchProject,
  upsertSections,
} from "@/features/projects/infrastructure/project-repository";
import {
  SECTION_KEYS,
  wordCount,
  type SectionKey,
} from "@/features/projects/domain/sections";

export type SaveSectionInput = {
  projectId: string;
  sectionKey: SectionKey;
  content: string;
};

export type SaveSectionDeps = {
  requireViewer: typeof requireViewer;
  getSectionWordCount: typeof getSectionWordCount;
  upsertSections: typeof upsertSections;
  touchProject: typeof touchProject;
  logAudit: typeof logAudit;
  now: () => string;
};

const defaultDeps: SaveSectionDeps = {
  requireViewer,
  getSectionWordCount,
  upsertSections,
  touchProject,
  logAudit,
  now: () => new Date().toISOString(),
};

export async function saveSection(
  input: SaveSectionInput,
  deps: SaveSectionDeps = defaultDeps,
): Promise<
  { ok: true; savedAt: string; wordCount: number } | { error: string }
> {
  if (!SECTION_KEYS.includes(input.sectionKey)) {
    return { error: "Unknown section." };
  }
  const { supabase, user } = await deps.requireViewer();

  const previousWords = await deps.getSectionWordCount(
    supabase,
    input.projectId,
    input.sectionKey,
  );

  const words = wordCount(input.content);
  const now = deps.now();
  const saved = await deps.upsertSections(supabase, [
    {
      project_id: input.projectId,
      section_key: input.sectionKey,
      content: input.content,
      word_count: words,
      updated_at: now,
    },
  ]);
  if ("error" in saved) return saved;

  // Bump the project so the dashboard "last edited" reflects section edits too.
  await deps.touchProject(supabase, input.projectId, now);

  await deps.logAudit(supabase, {
    userId: user.id,
    action: "section_edited",
    projectId: input.projectId,
    detail: {
      section_key: input.sectionKey,
      from_words: previousWords ?? 0,
      to_words: words,
    },
  });

  return { ok: true, savedAt: now, wordCount: words };
}
