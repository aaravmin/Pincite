import { describe, it, expect, vi } from "vitest";
import {
  uploadAttachment,
  type UploadAttachmentDeps,
} from "@/features/drawings/application/upload-attachment";
import { MAX_UPLOAD_BYTES } from "@/features/drawings/domain/upload-policy";
import type { Attachment } from "@/features/drawings/domain/types";
import type { TypedSupabaseClient } from "@/shared/db/types";

const supabase = {} as TypedSupabaseClient;

/** A minimal stand-in for the multipart File the route hands over. */
function fakeFile(p: Partial<{ name: string; type: string; size: number }> = {}) {
  return {
    name: "fig1.png",
    type: "image/png",
    size: 1024,
    arrayBuffer: async () => new TextEncoder().encode("png-bytes").buffer,
    ...p,
  } as unknown as File;
}

const inserted = (p: Partial<Attachment> = {}): Attachment => ({
  id: "att-1",
  project_id: "proj-1",
  kind: "drawing",
  view: "front",
  storage_path: "proj-1/fixed-id-fig1.png",
  filename: "fig1.png",
  mime: "image/png",
  size_bytes: 1024,
  created_at: "2026-01-01T00:00:00.000Z",
  analysis: null,
  annotations: null,
  page_index: null,
  ...p,
});

function deps(over: Partial<UploadAttachmentDeps> = {}) {
  const base: UploadAttachmentDeps = {
    projectIsVisible: vi.fn(async () => true),
    uploadObject: vi.fn(async () => null),
    insertAttachments: vi.fn(async () => ({ rows: [inserted()] })),
    removeObjects: vi.fn(async () => {}),
    logAudit: vi.fn(async () => {}),
    newId: () => "fixed-id",
  } as unknown as UploadAttachmentDeps;
  return { ...base, ...over };
}

const input = {
  supabase,
  userId: "user-1",
  projectId: "proj-1",
  file: fakeFile(),
  kind: "drawing",
  view: "front",
  ip: "203.0.113.9",
};

describe("uploadAttachment", () => {
  it("rejects a missing file before touching storage", async () => {
    const d = deps();
    expect(await uploadAttachment({ ...input, file: null }, d)).toEqual({
      error: "No file provided.",
      status: 400,
    });
    expect(d.uploadObject).not.toHaveBeenCalled();
  });

  it("rejects an unsupported mime before touching storage", async () => {
    const d = deps();
    expect(
      await uploadAttachment(
        { ...input, file: fakeFile({ type: "image/svg+xml" }) },
        d,
      ),
    ).toEqual({
      error: "Unsupported file type. Use PNG, JPEG, GIF, WEBP, or PDF.",
      status: 400,
    });
    expect(d.projectIsVisible).not.toHaveBeenCalled();
    expect(d.uploadObject).not.toHaveBeenCalled();
  });

  it("rejects an oversized file before touching storage", async () => {
    const d = deps();
    expect(
      await uploadAttachment(
        { ...input, file: fakeFile({ size: MAX_UPLOAD_BYTES + 1 }) },
        d,
      ),
    ).toEqual({ error: "File too large (max 25 MB).", status: 400 });
    expect(d.uploadObject).not.toHaveBeenCalled();
  });

  it("404s a project the caller cannot see, before touching storage", async () => {
    const d = deps({ projectIsVisible: vi.fn(async () => false) });
    expect(await uploadAttachment(input, d)).toEqual({
      error: "Project not found.",
      status: 404,
    });
    expect(d.uploadObject).not.toHaveBeenCalled();
  });

  it("namespaces the object by project id and sanitizes the name", async () => {
    const d = deps();
    await uploadAttachment(
      { ...input, file: fakeFile({ name: "my drawing (1).png" }) },
      d,
    );
    expect(d.uploadObject).toHaveBeenCalledWith(
      "proj-1/fixed-id-my_drawing__1_.png",
      expect.any(Buffer),
      "image/png",
    );
  });

  it("surfaces a storage failure without inserting a row", async () => {
    const d = deps({ uploadObject: vi.fn(async () => "bucket rejected the mime") });
    expect(await uploadAttachment(input, d)).toEqual({
      error: "bucket rejected the mime",
      status: 400,
    });
    expect(d.insertAttachments).not.toHaveBeenCalled();
  });

  it("removes the uploaded object when the row insert fails", async () => {
    const d = deps({
      insertAttachments: vi.fn(async () => ({ error: "insert denied" })),
    });
    expect(await uploadAttachment(input, d)).toEqual({
      error: "insert denied",
      status: 400,
    });
    expect(d.removeObjects).toHaveBeenCalledWith([
      "proj-1/fixed-id-fig1.png",
    ]);
    expect(d.logAudit).not.toHaveBeenCalled();
  });

  it("stores the original filename on the row and audits the upload with the IP", async () => {
    const d = deps();
    const result = await uploadAttachment(input, d);
    expect(result).toEqual({ attachment: inserted() });
    expect(d.insertAttachments).toHaveBeenCalledWith(supabase, [
      {
        project_id: "proj-1",
        kind: "drawing",
        view: "front",
        storage_path: "proj-1/fixed-id-fig1.png",
        filename: "fig1.png",
        mime: "image/png",
        size_bytes: 1024,
        page_index: null,
      },
    ]);
    expect(d.logAudit).toHaveBeenCalledWith(supabase, {
      userId: "user-1",
      action: "attachment_uploaded",
      projectId: "proj-1",
      detail: {
        kind: "drawing",
        view: "front",
        filename: "fig1.png",
        mime: "image/png",
      },
      ip: "203.0.113.9",
    });
  });

  it("coerces an unknown kind to drawing and an unknown view to null", async () => {
    const d = deps();
    await uploadAttachment({ ...input, kind: "junk", view: "isometric" }, d);
    expect(d.insertAttachments).toHaveBeenCalledWith(supabase, [
      expect.objectContaining({ kind: "drawing", view: null }),
    ]);
  });

  it("keeps the declaration kind, which is what 'signed' means", async () => {
    const d = deps();
    await uploadAttachment({ ...input, kind: "declaration", view: "" }, d);
    expect(d.insertAttachments).toHaveBeenCalledWith(supabase, [
      expect.objectContaining({ kind: "declaration", view: null }),
    ]);
  });

  it("returns the first page row of a multi-page insert", async () => {
    const d = deps({
      insertAttachments: vi.fn(async () => ({
        rows: [
          inserted({ id: "page-2", page_index: 1 }),
          inserted({ id: "page-1", page_index: 0 }),
        ],
      })),
    });
    const result = await uploadAttachment(input, d);
    expect(result).toMatchObject({ attachment: { id: "page-1" } });
  });
});
