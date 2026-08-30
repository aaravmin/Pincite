import { describe, it, expect } from "vitest";
import {
  ALLOWED_UPLOAD_MIMES,
  MAX_UPLOAD_BYTES,
  coerceAttachmentKind,
  coerceAttachmentView,
  safeUploadName,
  validateUpload,
} from "@/features/drawings/domain/upload-policy";

const file = (p: Partial<{ type: string; size: number; name: string }> = {}) => ({
  type: "image/png",
  size: 1000,
  name: "fig1.png",
  ...p,
});

describe("validateUpload", () => {
  it("accepts every allowed mime type", () => {
    for (const type of ALLOWED_UPLOAD_MIMES) {
      expect(validateUpload(file({ type }))).toEqual({ ok: true });
    }
  });

  it("rejects an unsupported type with the user-facing message", () => {
    expect(validateUpload(file({ type: "image/svg+xml" }))).toEqual({
      error: "Unsupported file type. Use PNG, JPEG, GIF, WEBP, or PDF.",
      status: 400,
    });
    expect(validateUpload(file({ type: "" }))).toMatchObject({ status: 400 });
  });

  it("rejects a file over 25 MB and accepts one exactly at the limit", () => {
    expect(validateUpload(file({ size: MAX_UPLOAD_BYTES + 1 }))).toEqual({
      error: "File too large (max 25 MB).",
      status: 400,
    });
    expect(validateUpload(file({ size: MAX_UPLOAD_BYTES }))).toEqual({ ok: true });
  });

  it("checks the type before the size", () => {
    expect(
      validateUpload(file({ type: "text/plain", size: MAX_UPLOAD_BYTES + 1 })),
    ).toMatchObject({ error: expect.stringContaining("Unsupported file type") });
  });
});

describe("safeUploadName", () => {
  it("replaces characters that are not storage-safe", () => {
    expect(safeUploadName("my drawing (1).png")).toBe("my_drawing__1_.png");
    expect(safeUploadName("../../etc/passwd")).toBe(".._.._etc_passwd");
  });

  it("keeps dots, dashes and underscores", () => {
    expect(safeUploadName("fig-01_v2.png")).toBe("fig-01_v2.png");
  });

  it("truncates to 80 characters", () => {
    expect(safeUploadName("a".repeat(200))).toHaveLength(80);
  });

  it("falls back to 'file' when nothing survives", () => {
    expect(safeUploadName("")).toBe("file");
  });
});

describe("kind and view coercion", () => {
  it("keeps a known kind and defaults everything else to drawing", () => {
    expect(coerceAttachmentKind("supporting")).toBe("supporting");
    expect(coerceAttachmentKind("declaration")).toBe("declaration");
    expect(coerceAttachmentKind("drawing")).toBe("drawing");
    expect(coerceAttachmentKind("nonsense")).toBe("drawing");
    expect(coerceAttachmentKind("")).toBe("drawing");
  });

  it("keeps a standard view and nulls anything else", () => {
    expect(coerceAttachmentView("perspective")).toBe("perspective");
    expect(coerceAttachmentView("")).toBeNull();
    expect(coerceAttachmentView("isometric")).toBeNull();
  });
});
