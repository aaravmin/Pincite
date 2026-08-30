import { describe, it, expect, vi } from "vitest";
import {
  deleteAttachment,
  type DeleteAttachmentDeps,
} from "@/features/drawings/application/delete-attachment";
import type { Attachment } from "@/features/drawings/domain/types";
import type { TypedSupabaseClient } from "@/shared/db/types";

const supabase = {} as TypedSupabaseClient;

const attachment = (p: Partial<Attachment> = {}): Attachment => ({
  id: "att-1",
  project_id: "proj-1",
  kind: "drawing",
  view: null,
  storage_path: "proj-1/doc.pdf",
  filename: "doc.pdf",
  mime: "application/pdf",
  size_bytes: 10,
  created_at: "2026-01-01T00:00:00.000Z",
  analysis: null,
  annotations: null,
  page_index: 0,
  ...p,
});

function deps(over: Partial<DeleteAttachmentDeps> = {}) {
  const base: DeleteAttachmentDeps = {
    findAttachment: vi.fn(async () => attachment()),
    countStoragePathSiblings: vi.fn(async () => 0),
    removeObjects: vi.fn(async () => {}),
    deleteAttachmentRow: vi.fn(async () => null),
    logAudit: vi.fn(async () => {}),
  } as unknown as DeleteAttachmentDeps;
  return { ...base, ...over };
}

const input = {
  supabase,
  userId: "user-1",
  projectId: "proj-1",
  attachmentId: "att-1",
};

describe("deleteAttachment", () => {
  it("refuses a row the caller cannot see, touching neither storage nor the table", async () => {
    const d = deps({ findAttachment: vi.fn(async () => null) });
    expect(await deleteAttachment(input, d)).toEqual({
      error: "Attachment not found.",
    });
    expect(d.removeObjects).not.toHaveBeenCalled();
    expect(d.deleteAttachmentRow).not.toHaveBeenCalled();
  });

  it("removes the storage object when this is the last row referencing it", async () => {
    const d = deps();
    expect(await deleteAttachment(input, d)).toEqual({ ok: true });
    expect(d.countStoragePathSiblings).toHaveBeenCalledWith(
      supabase,
      "proj-1",
      "proj-1/doc.pdf",
      "att-1",
    );
    expect(d.removeObjects).toHaveBeenCalledWith(["proj-1/doc.pdf"]);
    expect(d.deleteAttachmentRow).toHaveBeenCalledWith(supabase, "att-1");
  });

  it("keeps the storage object when sibling page rows still point at it", async () => {
    const d = deps({ countStoragePathSiblings: vi.fn(async () => 2) });
    expect(await deleteAttachment(input, d)).toEqual({ ok: true });
    expect(d.removeObjects).not.toHaveBeenCalled();
    expect(d.deleteAttachmentRow).toHaveBeenCalled();
  });

  it("surfaces a delete error and does not audit", async () => {
    const d = deps({ deleteAttachmentRow: vi.fn(async () => "row is locked") });
    expect(await deleteAttachment(input, d)).toEqual({ error: "row is locked" });
    expect(d.logAudit).not.toHaveBeenCalled();
  });

  it("audits the deletion against the project", async () => {
    const d = deps();
    await deleteAttachment(input, d);
    expect(d.logAudit).toHaveBeenCalledWith(supabase, {
      userId: "user-1",
      action: "attachment_deleted",
      projectId: "proj-1",
    });
  });
});
