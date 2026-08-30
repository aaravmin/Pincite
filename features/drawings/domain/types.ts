/**
 * Drawing-domain types: uploaded attachments (figures, supporting documents, the signed
 * declaration) and the vision drawing review pinned to 37 CFR 1.84 / 1.83. Pure - the only
 * non-local import is the generated row shape used by the row -> domain mapper below.
 */
import type { Tables } from "@/shared/db/database.types";

export type AttachmentKind = "drawing" | "supporting" | "declaration";

/** Standard patent drawing views (MPEP 1503 / common practice). "" means not specified. */
export const ATTACHMENT_VIEWS = [
  "",
  "perspective",
  "top",
  "bottom",
  "front",
  "rear",
  "left",
  "right",
  "section",
  "exploded",
] as const;
export type AttachmentView = (typeof ATTACHMENT_VIEWS)[number];
export const ATTACHMENT_VIEW_LABELS: Record<AttachmentView, string> = {
  "": "Not specified",
  perspective: "Perspective",
  top: "Top / plan",
  bottom: "Bottom",
  front: "Front",
  rear: "Rear",
  left: "Left side",
  right: "Right side",
  section: "Sectional",
  exploded: "Exploded",
};

/**
 * The editable drawing-annotation layer (the drawing editor). A movable reference-numeral
 * label sits at (x,y) normalized 0..1 from the top-left, with an optional lead line whose
 * endpoint (the part it points to) is `lead`. Seeded from the vision numerals, then edited.
 */
export type DrawingLabel = {
  id: string;
  text: string;
  x: number;
  y: number;
  lead: { x: number; y: number } | null;
};

export type DrawingAnnotations = {
  labels: DrawingLabel[];
  figureLabel: { text: string; x: number; y: number } | null;
};

export type Attachment = {
  id: string;
  project_id: string;
  kind: AttachmentKind;
  view: string | null;
  storage_path: string;
  filename: string;
  mime: string;
  size_bytes: number;
  created_at: string;
  /** Persisted vision drawing review, if this figure has been checked (survives reloads). */
  analysis: DrawingReview | null;
  /** Editable label/lead-line layer for the drawing editor (Feature 2). */
  annotations: DrawingAnnotations | null;
  /** Page within a multi-page PDF (one attachment row per page); null for images/single page. */
  page_index: number | null;
};

/**
 * A drawing-compliance issue found by the vision analysis. x,y are normalized 0..1 from the
 * top-left for an on-figure red circle (an approximate vision estimate); both are null when
 * the issue has no single location (e.g. a missing figure label).
 */
export type DrawingFinding = {
  id: string;
  title: string;
  detail: string;
  cfr: string;
  mpep: string | null;
  x: number | null;
  y: number | null;
};

export type DrawingReview = {
  summary: string;
  figureLabel: string | null;
  components: { name: string; shown: boolean }[];
  findings: DrawingFinding[];
};

/**
 * The database boundary for an attachment row. `analysis` and `annotations` are jsonb, so the
 * generated type is `Json` - this is the one place that widening is narrowed back to the
 * domain shapes, instead of casting the whole row at every call site.
 */
export function toAttachment(row: Tables<"project_attachments">): Attachment {
  return {
    id: row.id,
    project_id: row.project_id,
    kind: row.kind,
    view: row.view,
    storage_path: row.storage_path,
    filename: row.filename,
    mime: row.mime,
    size_bytes: row.size_bytes,
    created_at: row.created_at,
    analysis: (row.analysis as DrawingReview | null) ?? null,
    annotations: (row.annotations as DrawingAnnotations | null) ?? null,
    page_index: row.page_index,
  };
}

/**
 * "Signed" everywhere in Pincite means a declaration-kind attachment exists: the operative
 * signature lives on the document the inventor signs by hand and uploads, and Pincite never
 * verifies the signature itself. These predicates are the one home for that rule.
 */
export function isDeclaration(a: Pick<Attachment, "kind">): boolean {
  return a.kind === "declaration";
}

export function isDrawing(a: Pick<Attachment, "kind">): boolean {
  return a.kind === "drawing";
}

export function hasSignedDeclaration(
  attachments: readonly Pick<Attachment, "kind">[],
): boolean {
  return attachments.some(isDeclaration);
}

export function drawingCount(
  attachments: readonly Pick<Attachment, "kind">[],
): number {
  return attachments.filter(isDrawing).length;
}
