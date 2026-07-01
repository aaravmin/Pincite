/**
 * Composite one figure (a raster image plus the editable annotation overlay: reference
 * numerals, lead lines, figure label) into a single-page vector PDF, so the LaTeX export's
 * \includegraphics shows the EDITED drawing in the typeset patent. Pure JS (pdf-lib), no
 * native dependency. Annotations are black on a white halo, since a filed drawing is
 * black-and-white line art (the review red is screen-only).
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { DrawingAnnotations } from "@/lib/filing/types";
import { sanitizeOutputText } from "@/lib/text/sanitize";

const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);

export async function buildFigurePdf(opts: {
  bytes: Uint8Array;
  mime: string;
  annotations: DrawingAnnotations | null;
  /** Bake the figure label (FIG. N) into the image. Off when the caller captions it instead. */
  includeFigureLabel?: boolean;
}): Promise<Uint8Array | null> {
  const { bytes, mime } = opts;
  const a = opts.annotations ?? { labels: [], figureLabel: null };
  const doc = await PDFDocument.create();
  let img;
  try {
    img =
      mime === "image/png"
        ? await doc.embedPng(bytes)
        : mime === "image/jpeg"
          ? await doc.embedJpg(bytes)
          : null;
  } catch {
    return null;
  }
  if (!img) return null;

  const W = img.width;
  const H = img.height;
  const page = doc.addPage([W, H]);
  page.drawImage(img, { x: 0, y: 0, width: W, height: H });
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const size = Math.max(12, Math.round(Math.min(W, H) * 0.03));

  // pdf-lib's origin is bottom-left; annotation coordinates are normalized from the top-left.
  const px = (nx: number) => nx * W;
  const py = (ny: number) => H - ny * H;

  for (const l of a.labels) {
    if (l.lead) {
      page.drawLine({
        start: { x: px(l.x), y: py(l.y) },
        end: { x: px(l.lead.x), y: py(l.lead.y) },
        thickness: Math.max(1, size / 12),
        color: BLACK,
      });
    }
  }

  const label = (text: string, nx: number, ny: number, s: number) => {
    const clean = sanitizeOutputText(text);
    if (!clean) return;
    const w = font.widthOfTextAtSize(clean, s);
    const cx = px(nx);
    const baseline = py(ny) - s * 0.35;
    page.drawRectangle({
      x: cx - w / 2 - 1,
      y: baseline - 1,
      width: w + 2,
      height: s,
      color: WHITE,
    });
    page.drawText(clean, { x: cx - w / 2, y: baseline, size: s, font, color: BLACK });
  };
  for (const l of a.labels) label(l.text || "?", l.x, l.y, size);
  if ((opts.includeFigureLabel ?? true) && a.figureLabel?.text)
    label(a.figureLabel.text, a.figureLabel.x, a.figureLabel.y, Math.round(size * 1.1));

  return await doc.save();
}
