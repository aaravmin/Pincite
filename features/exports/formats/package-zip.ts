/**
 * Assemble the USPTO filing package: the specification DOCX, the ADS data, the inventors'
 * hand-signed declarations, the transmittal/fee checklist, the drawings, and a README that
 * walks the Patent Center upload. Pure over bytes - the caller reads the attachment bytes out
 * of Storage and hands them in, so this module has no database or HTTP dependency and can be
 * exercised with in-memory fixtures.
 */
import JSZip from "jszip";
import { buildSpecDocx } from "@/features/exports/formats/docx";
import {
  buildAdsText,
  buildDeclarationText,
  buildReadme,
  buildTransmittalAndFeesText,
} from "@/features/exports/formats/filing-package";
import type { DrawingFile, ExportContext } from "@/features/exports/types";
import { isDrawing, type Attachment } from "@/features/drawings/domain/types";

/** The extension a packaged drawing keeps, falling back to whatever the upload was named. */
function drawingExtension(a: Attachment): string {
  if (a.mime === "application/pdf") return "pdf";
  if (a.mime === "image/png") return "png";
  if (a.mime === "image/jpeg") return "jpg";
  return (a.filename.split(".").pop() || "img").toLowerCase();
}

/**
 * One entry per declaration ON THE MATTER, in the order the package names them. `bytes` is
 * null when Storage could not return the document: it is still listed on the cover sheet, so
 * a file that could not be read is named as expected rather than silently missing.
 */
export type DeclarationFile = { name: string; bytes: Uint8Array | null };

export async function buildFilingPackageZip(
  ctx: ExportContext,
  drawings: DrawingFile[],
  declarations: DeclarationFile[],
): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file("specification.docx", await buildSpecDocx(ctx.sections));
  zip.file(
    "application_data_sheet.txt",
    buildAdsText(ctx.project, ctx.inventors, ctx.title),
  );

  // The signed inventor declarations: the operative hand-signed documents the inventors
  // uploaded, bundled verbatim under declarations/ so the package is what actually gets filed.
  // The names are assigned once by the caller and reused for both the files and the cover
  // sheet, so the sheet can never list a name the package does not use.
  for (const d of declarations) {
    if (d.bytes) zip.file(`declarations/${d.name}`, d.bytes);
  }
  zip.file(
    "inventor_declaration.txt",
    buildDeclarationText(
      ctx.inventors,
      declarations.map((d) => d.name),
      ctx.title,
    ),
  );
  zip.file("transmittal_and_fees.txt", buildTransmittalAndFeesText(ctx.project));

  // Drawings, in order. The edit/vectorize surface was removed, so the filing package keeps
  // the user's uploaded drawing files as-is instead of filing derived editable scenes. The
  // figure number is the drawing's position among ALL drawings on the matter, so a file that
  // could not be read leaves a gap rather than renumbering the ones after it.
  const drawingAttachments = ctx.attachments.filter(isDrawing);
  for (const d of drawings) {
    const n = drawingAttachments.findIndex((a) => a.id === d.attachment.id) + 1;
    if (n === 0) continue;
    const name = `drawings/figure_${String(n).padStart(2, "0")}.${drawingExtension(d.attachment)}`;
    zip.file(name, d.bytes);
  }

  zip.file("README.txt", buildReadme());
  return new Uint8Array(await zip.generateAsync({ type: "nodebuffer" }));
}
