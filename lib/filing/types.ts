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

export type Attachment = {
  id: string;
  project_id: string;
  kind: AttachmentKind;
  storage_path: string;
  filename: string;
  mime: string;
  size_bytes: number;
  created_at: string;
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
