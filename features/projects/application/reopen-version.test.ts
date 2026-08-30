import { describe, expect, it, vi } from "vitest";
import {
  reopenVersion,
  type ReopenVersionDeps,
} from "@/features/projects/application/reopen-version";
import type { VersionSource } from "@/features/projects/infrastructure/project-repository";
import type { Viewer } from "@/shared/auth/require-viewer";
import type { logAudit as LogAudit } from "@/shared/audit/log";
import type { insertVersion as InsertVersion } from "@/features/projects/infrastructure/project-repository";
import type { TypedSupabaseClient } from "@/shared/db/types";

const supabase = {} as TypedSupabaseClient;
const viewer = { user: { id: "u1" }, supabase } as unknown as Viewer;

const source: VersionSource = {
  id: "v1",
  project_id: "p1",
  label: null,
  created_at: "2026-03-04T09:30:00.000Z",
  snapshot: {
    project: {
      name: "Adjustable mount",
      patent_type: "utility",
      declared_status: "drafting",
      application_number: null,
      filing_date: null,
    },
    sections: { title: "Adjustable mount", claims: "1. A mount." },
  },
};

function makeDeps(over: Partial<ReopenVersionDeps> = {}) {
  const upsertSections = vi.fn(async () => ({ ok: true }) as const);
  const insertVersion = vi.fn<typeof InsertVersion>(async () => ({ id: "v2" }));
  const touchProject = vi.fn(async () => {});
  const logAudit = vi.fn<typeof LogAudit>(async () => {});
  const deps: ReopenVersionDeps = {
    requireViewer: vi.fn(async () => viewer),
    loadVersion: vi.fn(async () => ({ version: source })),
    upsertSections,
    touchProject,
    insertVersion,
    logAudit,
    now: () => "2026-08-29T12:00:00.000Z",
    ...over,
  } as ReopenVersionDeps;
  return { deps, upsertSections, insertVersion, touchProject, logAudit };
}

describe("reopenVersion", () => {
  it("writes back only the sections the snapshot carried", async () => {
    const { deps, upsertSections } = makeDeps();
    const result = await reopenVersion(
      { projectId: "p1", versionId: "v1", mode: "restore" },
      deps,
    );
    expect(result).toEqual({ id: "v2" });
    expect(upsertSections).toHaveBeenCalledWith(supabase, [
      {
        project_id: "p1",
        section_key: "title",
        content: "Adjustable mount",
        word_count: 2,
        updated_at: "2026-08-29T12:00:00.000Z",
      },
      {
        project_id: "p1",
        section_key: "claims",
        content: "1. A mount.",
        word_count: 3,
        updated_at: "2026-08-29T12:00:00.000Z",
      },
    ]);
  });

  it("appends a new version linked to its source rather than overwriting history", async () => {
    const { deps, insertVersion } = makeDeps();
    await reopenVersion(
      { projectId: "p1", versionId: "v1", mode: "restore" },
      deps,
    );
    expect(insertVersion).toHaveBeenCalledWith(
      supabase,
      {
        projectId: "p1",
        userId: "u1",
        label: "Restored from 2026-03-04 09:30",
        snapshot: source.snapshot,
        parentVersionId: "v1",
      },
      "Could not reopen version.",
    );
  });

  it("labels a branch with the source save's own label when it has one", async () => {
    const { deps, insertVersion } = makeDeps({
      loadVersion: vi.fn(async () => ({
        version: { ...source, label: "Before the amendment" },
      })),
    });
    await reopenVersion(
      { projectId: "p1", versionId: "v1", mode: "branch" },
      deps,
    );
    expect(insertVersion.mock.calls[0][1].label).toBe(
      "Branch from Before the amendment",
    );
  });

  it("audits restore and branch as different actions", async () => {
    const restore = makeDeps();
    await reopenVersion(
      { projectId: "p1", versionId: "v1", mode: "restore" },
      restore.deps,
    );
    expect(restore.logAudit.mock.calls[0][1]).toMatchObject({
      action: "version_restored",
      versionId: "v2",
      detail: { source_version_id: "v1", mode: "restore" },
    });

    const branch = makeDeps();
    await reopenVersion(
      { projectId: "p1", versionId: "v1", mode: "branch" },
      branch.deps,
    );
    expect(branch.logAudit.mock.calls[0][1]).toMatchObject({
      action: "version_branched",
      detail: { source_version_id: "v1", mode: "branch" },
    });
  });

  it("refuses a version that belongs to another matter", async () => {
    const { deps, upsertSections } = makeDeps({
      loadVersion: vi.fn(async () => ({
        version: { ...source, project_id: "other" },
      })),
    });
    const result = await reopenVersion(
      { projectId: "p1", versionId: "v1", mode: "restore" },
      deps,
    );
    expect(result).toEqual({ error: "Version not found." });
    expect(upsertSections).not.toHaveBeenCalled();
  });

  it("reports a missing version as not found", async () => {
    const { deps } = makeDeps({
      loadVersion: vi.fn(async () => ({ version: null })),
    });
    expect(
      await reopenVersion(
        { projectId: "p1", versionId: "v1", mode: "restore" },
        deps,
      ),
    ).toEqual({ error: "Version not found." });
  });

  it("stops before appending a version when the section write fails", async () => {
    const { deps, insertVersion, logAudit } = makeDeps({
      upsertSections: vi.fn(async () => ({ error: "permission denied" })),
    });
    const result = await reopenVersion(
      { projectId: "p1", versionId: "v1", mode: "restore" },
      deps,
    );
    expect(result).toEqual({ error: "permission denied" });
    expect(insertVersion).not.toHaveBeenCalled();
    expect(logAudit).not.toHaveBeenCalled();
  });
});
