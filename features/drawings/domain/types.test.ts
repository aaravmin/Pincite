import { describe, it, expect } from "vitest";
import type { Tables } from "@/shared/db/database.types";
import {
  ATTACHMENT_VIEWS,
  ATTACHMENT_VIEW_LABELS,
  drawingCount,
  hasSignedDeclaration,
  isDeclaration,
  isDrawing,
  toAttachment,
  type Attachment,
  type AttachmentKind,
} from "@/features/drawings/domain/types";

const row = (
  p: Partial<Tables<"project_attachments">> = {},
): Tables<"project_attachments"> => ({
  id: "att-1",
  project_id: "proj-1",
  kind: "drawing",
  view: "front",
  storage_path: "proj-1/uuid-fig1.png",
  filename: "fig1.png",
  mime: "image/png",
  size_bytes: 1234,
  created_at: "2026-01-01T00:00:00.000Z",
  analysis: null,
  annotations: null,
  vector_scene_meta: null,
  page_index: null,
  ...p,
});

const att = (kind: AttachmentKind): Pick<Attachment, "kind"> => ({ kind });

describe("toAttachment", () => {
  it("maps every column onto the domain shape", () => {
    expect(toAttachment(row())).toEqual({
      id: "att-1",
      project_id: "proj-1",
      kind: "drawing",
      view: "front",
      storage_path: "proj-1/uuid-fig1.png",
      filename: "fig1.png",
      mime: "image/png",
      size_bytes: 1234,
      created_at: "2026-01-01T00:00:00.000Z",
      analysis: null,
      annotations: null,
      page_index: null,
    });
  });

  it("narrows the jsonb analysis column back to the review shape", () => {
    const analysis = {
      summary: "A container.",
      figureLabel: "FIG. 1",
      components: [{ name: "lid", shown: true }],
      findings: [],
    };
    expect(toAttachment(row({ analysis })).analysis).toEqual(analysis);
  });

  it("narrows the jsonb annotations column and drops undefined to null", () => {
    const annotations = { labels: [], figureLabel: null };
    expect(toAttachment(row({ annotations })).annotations).toEqual(annotations);
    expect(toAttachment(row({ annotations: null })).annotations).toBeNull();
  });

  it("drops the vector_scene_meta column that the removed editor left behind", () => {
    const mapped = toAttachment(row({ vector_scene_meta: { objects: [] } }));
    expect("vector_scene_meta" in mapped).toBe(false);
  });

  it("keeps a null view and a page index", () => {
    const mapped = toAttachment(row({ view: null, page_index: 2 }));
    expect(mapped.view).toBeNull();
    expect(mapped.page_index).toBe(2);
  });
});

describe("attachment-kind predicates", () => {
  it("recognizes a declaration and a drawing", () => {
    expect(isDeclaration(att("declaration"))).toBe(true);
    expect(isDeclaration(att("drawing"))).toBe(false);
    expect(isDrawing(att("drawing"))).toBe(true);
    expect(isDrawing(att("supporting"))).toBe(false);
  });

  it("treats a declaration attachment as the signature", () => {
    expect(hasSignedDeclaration([])).toBe(false);
    expect(hasSignedDeclaration([att("drawing"), att("supporting")])).toBe(false);
    expect(hasSignedDeclaration([att("drawing"), att("declaration")])).toBe(true);
  });

  it("counts only drawings", () => {
    expect(drawingCount([])).toBe(0);
    expect(
      drawingCount([att("drawing"), att("declaration"), att("drawing")]),
    ).toBe(2);
  });
});

describe("view labels", () => {
  it("labels every standard view", () => {
    for (const v of ATTACHMENT_VIEWS) {
      expect(ATTACHMENT_VIEW_LABELS[v]).toBeTruthy();
    }
    expect(ATTACHMENT_VIEW_LABELS[""]).toBe("Not specified");
  });
});
