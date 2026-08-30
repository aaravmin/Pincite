/**
 * The export feature's shared vocabulary. Pure: types plus two deterministic helpers, no
 * Supabase, no HTTP, no Next. Everything an export needs about a matter is carried in one
 * `ExportContext`, loaded once per request, so a formatter never reaches for the database.
 */
import type { SectionKey } from "@/lib/projects/sections";
import type { Project } from "@/lib/projects/types";
import type { Attachment, Inventor } from "@/lib/filing/types";

/** Every downloadable format the export route serves, in menu order. */
export const EXPORT_FORMATS = ["txt", "pdf", "docx", "latex", "package"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

/**
 * Read the `format` query parameter. An absent parameter means the review TXT (the historical
 * default); anything we do not serve is rejected rather than silently defaulted, so a typo
 * surfaces as a 400 instead of a surprise download.
 */
export function parseExportFormat(raw: string | null): ExportFormat | null {
  const value = raw ?? "txt";
  return (EXPORT_FORMATS as readonly string[]).includes(value)
    ? (value as ExportFormat)
    : null;
}

/**
 * Everything the formatters read, loaded once. `sections` and `inventors` are already run
 * through the output sanitizer; `project` and `attachments` are the raw records (the project
 * fields are sanitized at the point of use, and attachment paths must stay verbatim).
 */
export type ExportContext = {
  project: Project;
  /** Sanitized section text, every key present ("" when the section was never written). */
  sections: Record<SectionKey, string>;
  /** Sanitized inventor rows (name, residence, mailing address, citizenship). */
  inventors: Inventor[];
  attachments: Attachment[];
  /** Sanitized title section, "" when unset. */
  title: string;
};

/** One generated document, ready for a route handler to turn into a response. */
export type ExportArtifact = {
  body: Uint8Array | string;
  contentType: string;
  filename: string;
  disposition: "inline" | "attachment";
};

/** An attachment whose bytes were successfully read out of Storage. */
export type DrawingFile = {
  attachment: Attachment;
  bytes: Uint8Array;
};

/**
 * The download filename for each format. `safeId` is the sanitized project id. These strings
 * are user-visible (they land in the user's Downloads folder), so they are pinned by tests.
 */
export function exportFilename(format: ExportFormat, safeId: string): string {
  switch (format) {
    case "txt":
      return `pincite_${safeId}.txt`;
    case "pdf":
      return `patent_${safeId}.pdf`;
    case "docx":
      return `specification_${safeId}.docx`;
    case "latex":
      return `pincite_patent_latex_${safeId}.zip`;
    case "package":
      return `pincite_filing_${safeId}.zip`;
  }
}
