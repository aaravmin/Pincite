import "server-only";

/**
 * Produce one export artifact. This is the whole export pipeline: pick the format, load the
 * matter once, read whatever attachment bytes that format needs (all of them together), hand
 * the bytes to a pure formatter, and record the download.
 *
 * Three rules the route handler used to carry and no longer has to:
 *  - a PREVIEW is not a download. It streams the typeset patent inline and is never written
 *    to `exports` or the audit log, so the history stays a record of what the user actually
 *    took away.
 *  - every real download IS recorded, exactly once.
 *  - the format switch is exhaustive. A value that is not a served format cannot reach here
 *    (the controller rejects it) and could not silently fall through if it did - the `never`
 *    assignment in the default branch is a compile error the moment a format is added
 *    without a handler.
 */
import { buildSpecDocx } from "@/features/exports/formats/docx";
import { declarationZipNames } from "@/features/exports/formats/filing-package";
import { buildLatexBundle } from "@/features/exports/formats/latex-zip";
import {
  buildFilingPackageZip,
  type DeclarationFile,
} from "@/features/exports/formats/package-zip";
import { renderPatentPdf } from "@/features/exports/formats/pdf";
import { toText, type Report } from "@/features/exports/formats/txt";
import { buildReportData } from "@/features/exports/application/get-report";
import { loadExportContext } from "@/features/exports/application/load-export-context";
import { readAttachmentBytes } from "@/features/exports/infrastructure/attachment-reader";
import { recordExport } from "@/features/exports/infrastructure/export-log-repository";
import {
  exportFilename,
  type DrawingFile,
  type ExportArtifact,
  type ExportContext,
  type ExportFormat,
} from "@/features/exports/types";
import { getViewer } from "@/shared/auth/require-viewer";
import { sanitizeOutputFilename } from "@/shared/text/sanitize";
import {
  isDeclaration,
  isDrawing,
  type Attachment,
} from "@/features/drawings/domain/types";

const ZIP = "application/zip";
const PDF = "application/pdf";
const DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type ExportApplicationDeps = {
  loadContext: (projectId: string) => Promise<ExportContext | null>;
  loadReport: (projectId: string) => Promise<Report | null>;
  readAttachments: (paths: string[]) => Promise<Map<string, Uint8Array>>;
  record: (projectId: string, format: ExportFormat) => Promise<void>;
};

/**
 * The default recorder resolves the viewer itself. `getViewer` is request-cached, so this is
 * the same lookup the route handler already did for its 401 check, not a second round trip.
 */
async function recordForViewer(
  projectId: string,
  format: ExportFormat,
): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) return;
  await recordExport(viewer.supabase, viewer.user.id, projectId, format);
}

const defaultDeps: ExportApplicationDeps = {
  loadContext: loadExportContext,
  loadReport: buildReportData,
  readAttachments: readAttachmentBytes,
  record: recordForViewer,
};

/** Only PNG and JPEG drawings can be typeset; the others are not worth downloading. */
const isTypesettableDrawing = (a: Attachment) =>
  isDrawing(a) && (a.mime === "image/png" || a.mime === "image/jpeg");

/** Pair the attachments with their bytes, dropping any file Storage could not return. */
function pair(
  attachments: Attachment[],
  bytes: Map<string, Uint8Array>,
): DrawingFile[] {
  return attachments.flatMap((attachment) => {
    const found = bytes.get(attachment.storage_path);
    return found ? [{ attachment, bytes: found }] : [];
  });
}

async function loadTypesettableDrawings(
  ctx: ExportContext,
  deps: ExportApplicationDeps,
): Promise<DrawingFile[]> {
  const wanted = ctx.attachments.filter(isTypesettableDrawing);
  return pair(wanted, await deps.readAttachments(wanted.map((a) => a.storage_path)));
}

export async function exportApplication(
  input: { projectId: string; format: ExportFormat; preview: boolean },
  deps: ExportApplicationDeps = defaultDeps,
): Promise<ExportArtifact | null> {
  const { projectId, format, preview } = input;
  const safeId = sanitizeOutputFilename(projectId);

  // A half-screen preview shows what the application looks like typeset: the rendered patent
  // PDF, streamed inline so the browser displays the actual pages. Every previewable format
  // (PDF, LaTeX, filing package) previews this same document.
  if (preview) {
    const ctx = await deps.loadContext(projectId);
    if (!ctx) return null;
    const body = await renderPatentPdf(ctx, await loadTypesettableDrawings(ctx, deps));
    return {
      body,
      contentType: PDF,
      filename: exportFilename("pdf", safeId),
      disposition: "inline",
    };
  }

  const download = (body: Uint8Array | string, contentType: string): ExportArtifact => ({
    body,
    contentType,
    filename: exportFilename(format, safeId),
    disposition: "attachment",
  });

  switch (format) {
    // The analysis report (the user's own review), kept separate from filing documents.
    case "txt": {
      const report = await deps.loadReport(projectId);
      if (!report) return null;
      await deps.record(projectId, "txt");
      return download(toText(report), "text/plain; charset=utf-8");
    }

    // The typeset patent PDF: what the LaTeX bundle looks like compiled, ready to read or file.
    case "pdf": {
      const ctx = await deps.loadContext(projectId);
      if (!ctx) return null;
      const body = await renderPatentPdf(ctx, await loadTypesettableDrawings(ctx, deps));
      await deps.record(projectId, "pdf");
      return download(body, PDF);
    }

    // The specification only, as a 37 CFR 1.77 DOCX (the user's main Patent Center upload).
    case "docx": {
      const ctx = await deps.loadContext(projectId);
      if (!ctx) return null;
      const body = new Uint8Array(await buildSpecDocx(ctx.sections));
      await deps.record(projectId, "docx");
      return download(body, DOCX);
    }

    // Real-patent-format: a LaTeX source bundle (patent.tex + figure files) that typesets the
    // whole application like a published patent. Compiled by the user (Overleaf / pdflatex).
    case "latex": {
      const ctx = await deps.loadContext(projectId);
      if (!ctx) return null;
      const body = await buildLatexBundle(ctx, await loadTypesettableDrawings(ctx, deps));
      await deps.record(projectId, "latex");
      return download(body, ZIP);
    }

    // The full filing package: spec DOCX + ADS data + declarations + transmittal/fees + README.
    case "package": {
      const ctx = await deps.loadContext(projectId);
      if (!ctx) return null;
      const drawingAttachments = ctx.attachments.filter(isDrawing);
      const declarationAttachments = ctx.attachments.filter(isDeclaration);
      // Drawings and declarations are independent files: one concurrent read for all of them.
      const bytes = await deps.readAttachments(
        [...drawingAttachments, ...declarationAttachments].map((a) => a.storage_path),
      );
      // The packaged names are assigned HERE, once, and carried into the zip so the files and
      // the cover sheet cannot disagree. A document Storage could not return keeps its name
      // and travels with null bytes, which lists it on the sheet without writing a file.
      const names = declarationZipNames(
        declarationAttachments.map((a) => a.filename),
      );
      const declarations: DeclarationFile[] = declarationAttachments.map((a, i) => ({
        name: names[i],
        bytes: bytes.get(a.storage_path) ?? null,
      }));
      const body = await buildFilingPackageZip(
        ctx,
        pair(drawingAttachments, bytes),
        declarations,
      );
      await deps.record(projectId, "package");
      return download(body, ZIP);
    }

    default: {
      // Exhaustiveness guard: adding a format without a case is a compile error here, and a
      // value that somehow slipped past the controller's validation loads nothing.
      const unhandled: never = format;
      console.error(`[exports] unhandled export format: ${String(unhandled)}`);
      return null;
    }
  }
}
