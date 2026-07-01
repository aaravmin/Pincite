/**
 * Decode an uploaded drawing to an RGBA bitmap for vectorization. Server-only: it pulls in the
 * native @napi-rs/canvas and pdfjs-dist, which must never enter the client bundle.
 */
import "server-only";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

export type Bitmap = { rgba: Uint8ClampedArray; width: number; height: number };

const DEFAULT_MAX_DIM = 2000;

/** Path to pdfjs' bundled standard fonts, so embedded text renders (best-effort). */
function standardFontsDir(): string | undefined {
  try {
    const require = createRequire(import.meta.url);
    return join(dirname(require.resolve("pdfjs-dist/package.json")), "standard_fonts/");
  } catch {
    return undefined;
  }
}

/**
 * Decode PNG/JPEG/GIF/WEBP bytes to RGBA, downscaling so the longest side is at most `maxDim`
 * (keeps the connected-component pass bounded). The image is composited onto white first, so a
 * transparent PNG vectorizes its strokes rather than treating the whole canvas as ink.
 */
export async function decodeImageToRgba(
  bytes: Uint8Array,
  maxDim = DEFAULT_MAX_DIM,
): Promise<Bitmap> {
  const { loadImage, createCanvas } = await import("@napi-rs/canvas");
  const img = await loadImage(Buffer.from(bytes));
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height).data;
  return { rgba: data, width, height };
}

/** Page count of a PDF without rasterizing (pdf-lib is already a dependency). */
export async function pdfPageCount(bytes: Uint8Array): Promise<number> {
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  return doc.getPageCount();
}

/** Rasterize one page of a PDF to RGBA, scaled so the longest side is at most `maxDim`. */
export async function rasterizePdfPage(
  bytes: Uint8Array,
  pageIndex = 0,
  maxDim = DEFAULT_MAX_DIM,
): Promise<Bitmap> {
  const [{ createCanvas }, pdfjs] = await Promise.all([
    import("@napi-rs/canvas"),
    import("pdfjs-dist/legacy/build/pdf.mjs"),
  ]);
  const task = pdfjs.getDocument({
    data: bytes,
    isEvalSupported: false,
    useSystemFonts: false,
    standardFontDataUrl: standardFontsDir(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  const doc = await task.promise;
  try {
    const page = await doc.getPage(pageIndex + 1);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(4, maxDim / Math.max(base.width, base.height));
    const viewport = page.getViewport({ scale });
    const width = Math.max(1, Math.ceil(viewport.width));
    const height = Math.max(1, Math.ceil(viewport.height));
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    await page.render({
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
      canvas: canvas as unknown as HTMLCanvasElement,
    }).promise;
    const data = ctx.getImageData(0, 0, width, height).data;
    return { rgba: data, width, height };
  } finally {
    await task.destroy();
  }
}
