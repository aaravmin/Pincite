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

/**
 * One vectorized element of a drawing: a single traced ink island, or a line the user added
 * in the editor. Geometry lives in the scene's intrinsic pixel space (the rasterized page or
 * image, `VectorScene.width` x `.height`); `transform` then moves/scales/rotates it so the
 * original trace stays intact while the user repositions it. `d` is SVG path data with one or
 * more `M..Z` subpaths (extra subpaths punch holes). `hidden` keeps the object in the scene
 * but skips it on render and export. Drawing line-art is always black.
 */
export type VectorObject = {
  id: string;
  d: string;
  bbox: { x: number; y: number; w: number; h: number };
  transform: { tx: number; ty: number; sx: number; sy: number; rot: number };
  hidden: boolean;
  z: number;
  source: "trace" | "user";
  fill: "#000000" | "none";
  stroke: { color: "#000000"; width: number } | null;
};

export type VectorScene = {
  version: 1;
  width: number;
  height: number;
  objects: VectorObject[];
  source: { kind: "pdf" | "image"; pageIndex: number; tracedAt: string };
};

/**
 * The small pointer persisted in `project_attachments.vector_scene_meta`. The scene body
 * itself (potentially MBs of path data) lives in Storage at the `storagePath`, so list queries
 * that load every attachment stay light. `edited` flips true once the user saves a change and
 * gates re-vectorization so a re-seed never clobbers their edits.
 */
export type VectorSceneMeta = {
  version: 1;
  storagePath: string;
  width: number;
  height: number;
  objectCount: number;
  edited: boolean;
  tracedAt: string;
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
  /** Pointer to the editable vectorized scene in Storage, null until the figure is vectorized. */
  vector_scene_meta: VectorSceneMeta | null;
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
