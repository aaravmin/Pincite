/** Filing-domain types: ADS inventors, applicant, attachments, declarations. */

export type Inventor = {
  id: string;
  project_id: string;
  legal_name: string;
  residence: string;
  mailing_address: string;
  citizenship: string;
  ord: number;
  created_at: string;
};

/** A draft inventor row before it is persisted (no id/ord yet). */
export type InventorInput = {
  legal_name: string;
  residence: string;
  mailing_address: string;
  citizenship: string;
};

export type AttachmentKind = "drawing" | "supporting";

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

/** A 3D model upload, rendered in-browser with an orientation toggle (never sent to a model). */
export function is3dModel(mime: string, filename: string): boolean {
  const n = filename.toLowerCase();
  return (
    mime === "model/gltf-binary" ||
    mime === "model/gltf+json" ||
    n.endsWith(".glb") ||
    n.endsWith(".gltf")
  );
}

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
};

/** The five 37 CFR 1.63 attestations captured when an inventor signs (PTO/AIA/01). */
export type DeclarationStatements = {
  made_or_authorized: boolean;
  original_inventor: boolean;
  reviewed_understood: boolean;
  duty_to_disclose: boolean;
  penalty_acknowledged: boolean;
};

export type Declaration = {
  id: string;
  project_id: string;
  inventor_id: string | null;
  legal_name: string;
  statements: DeclarationStatements;
  signed_at: string;
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
