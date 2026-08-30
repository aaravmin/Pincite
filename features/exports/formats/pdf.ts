/**
 * Render the application as a typeset patent PDF, with each uploaded drawing baked into a
 * figure PDF (numerals + lead lines) and embedded on its own page. This is the visual output
 * shown in the half-screen preview and downloaded as the PDF format; it is what the LaTeX
 * bundle looks like compiled. Pure over bytes - the caller supplies the Storage bytes.
 */
import { buildFigurePdf } from "@/features/exports/formats/figure-pdf";
import { figureDescription } from "@/features/exports/formats/latex";
import { buildPatentPdf } from "@/features/exports/formats/patent-pdf";
import type { DrawingFile, ExportContext } from "@/features/exports/types";

export async function renderPatentPdf(
  ctx: ExportContext,
  drawings: DrawingFile[],
): Promise<Uint8Array> {
  const figures: { pdf: Uint8Array; label: string; description: string }[] = [];
  let n = 0;
  for (const d of drawings) {
    if (d.attachment.mime !== "image/png" && d.attachment.mime !== "image/jpeg")
      continue;
    n++;
    const pdf = await buildFigurePdf({
      bytes: d.bytes,
      mime: d.attachment.mime,
      annotations: null,
      includeFigureLabel: false,
    });
    if (pdf) {
      figures.push({
        pdf,
        label: `FIG. ${n}`,
        description: figureDescription(d.attachment.view),
      });
    }
  }
  return buildPatentPdf({
    sections: ctx.sections,
    title: ctx.title,
    inventors: ctx.inventors.map((i) => i.legal_name).filter(Boolean),
    figures,
  });
}
