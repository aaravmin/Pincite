import { describe, expect, it, vi } from "vitest";
import type { TypedSupabaseClient } from "@/shared/db/types";
import { SECTION_KEYS } from "@/features/projects/domain/sections";
import {
  loadAttachments,
  loadDisclosure,
  loadExports,
  loadProject,
  loadSections,
} from "@/features/projects/infrastructure/snapshot-repository";

type QueryResult = { data: unknown; error: { message: string } | null };

/**
 * A stand-in for the request-scoped client: every builder method returns the builder, which
 * is itself thenable, so both `await from().select().eq()` and `.maybeSingle()` resolve to
 * the one canned result. The repository does no branching on the query shape, so one result
 * per call is all these reads need.
 */
function client(result: QueryResult): TypedSupabaseClient {
  const builder = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    maybeSingle: async () => result,
    then: (
      onOk: (value: QueryResult) => unknown,
      onErr?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(onOk, onErr),
  };
  return { from: () => builder } as unknown as TypedSupabaseClient;
}

const ok = (data: unknown) => client({ data, error: null });
const fails = () => client({ data: null, error: { message: "boom" } });

describe("loadExports", () => {
  it("keeps only the columns the readiness gates read, newest first as queried", async () => {
    const rows = await loadExports(
      ok([
        { id: "e2", format: "package", created_at: "2026-02-01T00:00:00Z", extra: 1 },
        { id: "e1", format: "docx", created_at: "2026-01-01T00:00:00Z", extra: 2 },
      ]),
      "p1",
    );

    expect(rows).toEqual([
      { id: "e2", format: "package", created_at: "2026-02-01T00:00:00Z" },
      { id: "e1", format: "docx", created_at: "2026-01-01T00:00:00Z" },
    ]);
  });

  it("reads as no exports yet when the table is empty", async () => {
    expect(await loadExports(ok(null), "p1")).toEqual([]);
  });

  /**
   * The export history only dims the Submission tick. Failing it would take down every screen
   * that loads the snapshot, which is a far worse answer than an un-ticked step.
   */
  it("is NON-FATAL: a failed read logs and reads as no exports", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(loadExports(fails(), "p1")).resolves.toEqual([]);
    expect(logged).toHaveBeenCalledTimes(1);
    expect(String(logged.mock.calls[0][0])).toContain("p1");

    logged.mockRestore();
  });
});

describe("the reads that stay fatal", () => {
  it("throws when the project row cannot be read", async () => {
    await expect(loadProject(fails(), "p1")).rejects.toThrow("load project: boom");
  });

  it("throws when the draft sections cannot be read", async () => {
    await expect(loadSections(fails(), "p1")).rejects.toThrow("load sections: boom");
  });
});

describe("row mapping", () => {
  it("gives every section key a value, filling the missing rows with empty text", async () => {
    const sections = await loadSections(
      ok([{ section_key: "claims", content: "1. A device." }]),
      "p1",
    );

    expect(Object.keys(sections).sort()).toEqual([...SECTION_KEYS].sort());
    expect(sections.claims).toBe("1. A device.");
    expect(sections.abstract).toBe("");
  });

  it("maps a disclosure row through the disclosure domain, so it is always total", async () => {
    const disclosure = await loadDisclosure(
      ok({ project_id: "p1", components: "a lid", problem_solved: null }),
      "p1",
    );

    expect(disclosure.components).toBe("a lid");
    expect(disclosure.problem_solved).toBe("");
    expect(disclosure.known_prior_art).toBe("");
  });

  it("maps attachments through the drawings domain, narrowing the jsonb columns", async () => {
    const [attachment] = await loadAttachments(
      ok([
        {
          id: "a1",
          project_id: "p1",
          kind: "drawing",
          view: "front",
          storage_path: "p1/a1",
          filename: "fig1.png",
          mime: "image/png",
          size_bytes: 10,
          created_at: "2026-01-01T00:00:00Z",
          analysis: null,
          annotations: null,
          page_index: null,
        },
      ]),
      "p1",
    );

    expect(attachment.kind).toBe("drawing");
    expect(attachment.analysis).toBeNull();
    expect(attachment.annotations).toBeNull();
  });
});
