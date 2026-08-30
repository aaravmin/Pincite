import { describe, expect, it, vi } from "vitest";
import { saveSection } from "@/features/projects/application/save-section";
import type { SaveSectionDeps } from "@/features/projects/application/save-section";
import type { Viewer } from "@/shared/auth/require-viewer";
import type { logAudit as LogAudit } from "@/shared/audit/log";
import type { TypedSupabaseClient } from "@/shared/db/types";

const supabase = {} as TypedSupabaseClient;
const viewer = { user: { id: "u1" }, supabase } as unknown as Viewer;

function makeDeps(over: Partial<SaveSectionDeps> = {}) {
  const upsertSections = vi.fn(async () => ({ ok: true }) as const);
  const touchProject = vi.fn(async () => {});
  const logAudit = vi.fn<typeof LogAudit>(async () => {});
  const deps: SaveSectionDeps = {
    requireViewer: vi.fn(async () => viewer),
    getSectionWordCount: vi.fn(async () => 4),
    upsertSections,
    touchProject,
    logAudit,
    now: () => "2026-08-29T12:00:00.000Z",
    ...over,
  } as SaveSectionDeps;
  return { deps, upsertSections, touchProject, logAudit };
}

describe("saveSection", () => {
  it("rejects an unknown section before touching the database", async () => {
    const { deps, upsertSections } = makeDeps();
    const result = await saveSection(
      // A section key the model does not define must never reach an upsert.
      { projectId: "p1", sectionKey: "nope" as "claims", content: "x" },
      deps,
    );
    expect(result).toEqual({ error: "Unknown section." });
    expect(upsertSections).not.toHaveBeenCalled();
  });

  it("stores the content with its word count and the save timestamp", async () => {
    const { deps, upsertSections } = makeDeps();
    const result = await saveSection(
      { projectId: "p1", sectionKey: "abstract", content: "  one two three  " },
      deps,
    );
    expect(result).toEqual({
      ok: true,
      savedAt: "2026-08-29T12:00:00.000Z",
      wordCount: 3,
    });
    expect(upsertSections).toHaveBeenCalledWith(supabase, [
      {
        project_id: "p1",
        section_key: "abstract",
        content: "  one two three  ",
        word_count: 3,
        updated_at: "2026-08-29T12:00:00.000Z",
      },
    ]);
  });

  it("bumps the project so 'last edited' tracks section edits", async () => {
    const { deps, touchProject } = makeDeps();
    await saveSection(
      { projectId: "p1", sectionKey: "abstract", content: "one" },
      deps,
    );
    expect(touchProject).toHaveBeenCalledWith(
      supabase,
      "p1",
      "2026-08-29T12:00:00.000Z",
    );
  });

  it("audits the edit with the word count before and after", async () => {
    const { deps, logAudit } = makeDeps();
    await saveSection(
      { projectId: "p1", sectionKey: "claims", content: "one two" },
      deps,
    );
    expect(logAudit).toHaveBeenCalledWith(supabase, {
      userId: "u1",
      action: "section_edited",
      projectId: "p1",
      detail: { section_key: "claims", from_words: 4, to_words: 2 },
    });
  });

  it("records 0 previous words when the section had never been saved", async () => {
    const { deps, logAudit } = makeDeps({
      getSectionWordCount: vi.fn(async () => null),
    });
    await saveSection(
      { projectId: "p1", sectionKey: "claims", content: "one" },
      deps,
    );
    expect(logAudit.mock.calls[0][1].detail).toMatchObject({ from_words: 0 });
  });

  it("returns the database message and writes no audit row when the upsert fails", async () => {
    const { deps, logAudit, touchProject } = makeDeps({
      upsertSections: vi.fn(async () => ({ error: "permission denied" })),
    });
    const result = await saveSection(
      { projectId: "p1", sectionKey: "claims", content: "one" },
      deps,
    );
    expect(result).toEqual({ error: "permission denied" });
    expect(touchProject).not.toHaveBeenCalled();
    expect(logAudit).not.toHaveBeenCalled();
  });
});
