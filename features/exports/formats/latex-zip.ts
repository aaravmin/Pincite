/**
 * Assemble the real-patent-format LaTeX bundle: patent.tex plus one file per figure plus a
 * README explaining how to compile it (Overleaf or pdflatex). Each figure is baked into a
 * single-page PDF so \includegraphics shows the drawing exactly as uploaded; if a drawing
 * cannot be embedded the raw image is bundled instead, since pdflatex reads PNG and JPEG too.
 * Pure over bytes - the caller supplies the Storage bytes.
 */
import JSZip from "jszip";
import { buildFigurePdf } from "@/features/exports/formats/figure-pdf";
import {
  buildLatexReadme,
  buildPatentLatex,
  figureDescription,
} from "@/features/exports/formats/latex";
import type { DrawingFile, ExportContext } from "@/features/exports/types";

export async function buildLatexBundle(
  ctx: ExportContext,
  drawings: DrawingFile[],
): Promise<Uint8Array> {
  const zip = new JSZip();
  const figures: { file: string; label: string; description: string }[] = [];
  let n = 0;
  for (const d of drawings) {
    // pdflatex reads PNG, JPEG, and PDF; skip formats it cannot include.
    const ext =
      d.attachment.mime === "image/png"
        ? "png"
        : d.attachment.mime === "image/jpeg"
          ? "jpg"
          : null;
    if (!ext) continue;
    n++;
    // Figures are numbered by sequence in the formal document; the page caption supplies the
    // FIG. label, so the baked image carries only the numerals and lead lines.
    const stem = `figures/figure_${String(n).padStart(2, "0")}`;
    const label = `FIG. ${n}`;
    const description = figureDescription(d.attachment.view);
    const pdf = await buildFigurePdf({
      bytes: d.bytes,
      mime: d.attachment.mime,
      annotations: null,
      includeFigureLabel: false,
    });
    if (pdf) {
      zip.file(`${stem}.pdf`, pdf);
      figures.push({ file: `${stem}.pdf`, label, description });
    } else {
      zip.file(`${stem}.${ext}`, d.bytes);
      figures.push({ file: `${stem}.${ext}`, label, description });
    }
  }

  zip.file(
    "patent.tex",
    buildPatentLatex({
      sections: ctx.sections,
      title: ctx.title,
      inventors: ctx.inventors.map((i) => i.legal_name).filter(Boolean),
      figures,
    }),
  );
  zip.file("README.txt", buildLatexReadme(figures.length));
  return new Uint8Array(await zip.generateAsync({ type: "nodebuffer" }));
}
