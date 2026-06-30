/**
 * Render a figure with its editable annotation layer baked in, as a standalone SVG (the raster
 * image embedded plus the vector overlay: reference numerals, lead lines, figure label). Shared
 * by the drawing editor's per-figure export and the server-side filing package, so the exported
 * figure matches what you see. Annotations are drawn in BLACK with a white halo, since a filed
 * patent drawing is black-and-white line art (the review red is a screen-only signal).
 *
 * Pure and isomorphic: no Node or DOM APIs, safe to import on the client and the server.
 */
import type { DrawingAnnotations } from "@/lib/filing/types";

function esc(s: string): string {
  return s.replace(
    /[<>&"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c] ?? c,
  );
}

export function buildFigureSvg(opts: {
  width: number;
  height: number;
  imageHref: string; // a data: URL (self-contained) or a same-origin URL
  annotations: DrawingAnnotations | null;
}): string {
  const { width: W, height: H, imageHref } = opts;
  const a = opts.annotations ?? { labels: [], figureLabel: null };
  const font = Math.max(12, Math.round(Math.min(W, H) * 0.03));
  const stroke = Math.max(1, font / 12);
  const halo = font / 5;
  const parts: string[] = [
    `<image href="${imageHref}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid meet"/>`,
  ];
  const text = (t: string, x: number, y: number, size: number) =>
    `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="bold" text-anchor="middle" dominant-baseline="central" paint-order="stroke" stroke="#ffffff" stroke-width="${halo.toFixed(2)}" fill="#000000">${esc(t)}</text>`;

  for (const l of a.labels) {
    const lx = l.x * W;
    const ly = l.y * H;
    if (l.lead) {
      parts.push(
        `<line x1="${lx.toFixed(1)}" y1="${ly.toFixed(1)}" x2="${(l.lead.x * W).toFixed(1)}" y2="${(l.lead.y * H).toFixed(1)}" stroke="#000000" stroke-width="${stroke.toFixed(2)}"/>`,
      );
    }
    parts.push(text(l.text || "?", lx, ly, font));
  }
  if (a.figureLabel?.text) {
    parts.push(
      text(a.figureLabel.text, a.figureLabel.x * W, a.figureLabel.y * H, Math.round(font * 1.1)),
    );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${parts.join("")}</svg>`;
}

/**
 * Read an image's pixel dimensions from its bytes without a native dependency. Handles PNG,
 * GIF, and JPEG (the upload allowlist); returns null for anything it can't parse (e.g. WEBP),
 * so the caller can fall back to embedding the raw image.
 */
export function imageSize(
  bytes: Uint8Array,
): { width: number; height: number } | null {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // PNG: 89 50 4E 47, IHDR width/height as big-endian uint32 at offsets 16/20.
  if (bytes.length > 24 && bytes[0] === 0x89 && bytes[1] === 0x50) {
    return { width: dv.getUint32(16), height: dv.getUint32(20) };
  }
  // GIF: "GIF8", logical screen width/height as little-endian uint16 at offsets 6/8.
  if (bytes.length > 10 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return { width: dv.getUint16(6, true), height: dv.getUint16(8, true) };
  }
  // JPEG: FF D8, then walk segment markers to the start-of-frame (SOFn).
  if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = bytes[i + 1];
      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc
      ) {
        return { height: dv.getUint16(i + 5), width: dv.getUint16(i + 7) };
      }
      i += 2 + dv.getUint16(i + 2);
    }
  }
  return null;
}
