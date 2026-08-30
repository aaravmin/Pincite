import "server-only";

/**
 * Serve a filing document as a PDF to print, sign, and upload back: the inventor's
 * declaration (37 CFR 1.63 / PTO-AIA-01, one page per inventor) or, for an attorney, the
 * power of attorney (37 CFR 1.32).
 *
 * These are documents the user signs off-platform, not exports of the user's own analysis, so
 * they are deliberately NOT written to `exports` - the export history stays a record of the
 * application documents the user downloaded to file.
 */
import {
  buildDeclarationPdf,
  buildPoaPdf,
} from "@/features/exports/formats/declaration-pdf";
import { loadExportContext } from "@/features/exports/application/load-export-context";
import type { ExportArtifact, ExportContext } from "@/features/exports/types";
import { sanitizeOutputFilename, sanitizeOutputText } from "@/shared/text/sanitize";

export type FilingDocument = "poa" | "declaration";

export type BuildDeclarationDeps = {
  loadContext: (projectId: string) => Promise<ExportContext | null>;
};

const defaultDeps: BuildDeclarationDeps = { loadContext: loadExportContext };

/** Read the `doc` query parameter; anything but "poa" means the inventor's declaration. */
export function parseFilingDocument(raw: string | null): FilingDocument {
  return raw === "poa" ? "poa" : "declaration";
}

export async function buildDeclaration(
  input: { projectId: string; doc: FilingDocument },
  deps: BuildDeclarationDeps = defaultDeps,
): Promise<ExportArtifact | null> {
  const ctx = await deps.loadContext(input.projectId);
  if (!ctx) return null;

  const safeId = sanitizeOutputFilename(input.projectId);
  // The section text and the inventor fields arrive sanitized on the context; the applicant
  // name comes straight off the project row, so it is sanitized here.
  if (input.doc === "poa") {
    const body = await buildPoaPdf({
      title: ctx.title,
      applicant: sanitizeOutputText(
        ctx.project.applicant_name || ctx.project.client_name || "",
      ),
      practitioner: "",
    });
    return {
      body,
      contentType: "application/pdf",
      filename: `power_of_attorney_${safeId}.pdf`,
      disposition: "attachment",
    };
  }

  const body = await buildDeclarationPdf({
    title: ctx.title,
    inventors: ctx.inventors.map((i) => ({ legal_name: i.legal_name })),
  });
  return {
    body,
    contentType: "application/pdf",
    filename: `declaration_${safeId}.pdf`,
    disposition: "attachment",
  };
}
