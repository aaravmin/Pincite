/**
 * Turn an RGBA bitmap into a bilevel ink mask (1 = ink, 0 = background).
 *
 * Patent figures come in two flavours and we have to handle both. Clean line-art is dark strokes
 * on a flat light ground. Modern CAD renders are continuous-tone grey with shading and a noisy
 * ground, where a single global cut would classify the background texture as ink and shatter into
 * hundreds of thousands of speckles. So the default is an ADAPTIVE threshold: a pixel is ink only
 * when it is meaningfully darker than its local neighbourhood, which keeps the linework (strokes,
 * numerals, lead lines, hard outlines) and lets smooth shading and flat ground fall away. A light
 * denoise first kills salt-and-pepper speckle. A global Otsu mode is kept for the rare flat-tone
 * case and as an explicit option.
 *
 * Pure and dependency-free so it is unit-testable on its own.
 */

export type BinarizeOptions = {
  method?: "adaptive" | "otsu";
  /** Adaptive window (odd-ish, in px). Defaults to a fraction of the image's smaller side. */
  window?: number;
  /** How much darker than the local mean a pixel must be to count as ink (0..255). */
  c?: number;
  /** Box-blur radius applied to luminance before thresholding (0 disables). */
  denoise?: number;
  /**
   * Absolute-darkness floor: any pixel at or below this is ink regardless of its neighbourhood.
   * The adaptive term alone only catches the *edge* of a solid black region (the interior equals
   * its local mean), so this keeps filled arrowheads, bold strokes, and solid silhouettes solid.
   * Kept low so it never re-admits a mid-grey shaded ground.
   */
  hardDark?: number;
};

/** Luminance plane (Rec. 601), transparent pixels forced to white. */
function toGray(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): Float32Array {
  const n = width * height;
  const g = new Float32Array(n);
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    g[p] =
      rgba[i + 3] < 8 ? 255 : (rgba[i] * 299 + rgba[i + 1] * 587 + rgba[i + 2] * 114) / 1000;
  }
  return g;
}

/** Summed-area table so any window mean is O(1). Size (w+1)*(h+1). */
function integralImage(g: Float32Array, width: number, height: number): Float64Array {
  const iw = width + 1;
  const ii = new Float64Array(iw * (height + 1));
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    for (let x = 0; x < width; x++) {
      rowSum += g[y * width + x];
      ii[(y + 1) * iw + (x + 1)] = ii[y * iw + (x + 1)] + rowSum;
    }
  }
  return ii;
}

function boxBlur(g: Float32Array, width: number, height: number, radius: number): Float32Array {
  if (radius <= 0) return g;
  const ii = integralImage(g, width, height);
  const iw = width + 1;
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(height - 1, y + radius);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width - 1, x + radius);
      const sum =
        ii[(y1 + 1) * iw + (x1 + 1)] -
        ii[y0 * iw + (x1 + 1)] -
        ii[(y1 + 1) * iw + x0] +
        ii[y0 * iw + x0];
      out[y * width + x] = sum / ((y1 - y0 + 1) * (x1 - x0 + 1));
    }
  }
  return out;
}

function otsuThreshold(g: Float32Array): number {
  const hist = new Float64Array(256);
  for (let p = 0; p < g.length; p++) hist[Math.min(255, Math.max(0, Math.round(g[p])))]++;
  const total = g.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0;
  let wB = 0;
  let maxVar = -1;
  let threshold = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const between = wB * wF * (sumB / wB - (sum - sumB) / wF) ** 2;
    if (between > maxVar) {
      maxVar = between;
      threshold = t;
    }
  }
  return threshold;
}

export function toBilevel(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  opts: BinarizeOptions = {},
): Uint8Array {
  const n = width * height;
  const method = opts.method ?? "adaptive";
  let g = toGray(rgba, width, height);
  const denoise = opts.denoise ?? 1;
  if (denoise > 0) g = boxBlur(g, width, height, denoise);

  const mask = new Uint8Array(n);

  if (method === "otsu") {
    const threshold = otsuThreshold(g);
    let ink = 0;
    for (let p = 0; p < n; p++)
      if (g[p] <= threshold) {
        mask[p] = 1;
        ink++;
      }
    if (ink > n / 2) for (let p = 0; p < n; p++) mask[p] = mask[p] ? 0 : 1;
    return mask;
  }

  // Adaptive: ink where the pixel is near-black outright, OR at least `c` darker than its local
  // mean. The local-mean term extracts linework on a shaded/uneven ground; the absolute floor
  // keeps solid-black fills solid instead of hollowing them to outlines.
  const win = opts.window ?? Math.max(15, Math.round(Math.min(width, height) / 40));
  const radius = Math.max(3, Math.floor(win / 2));
  const c = opts.c ?? 12;
  const hardDark = opts.hardDark ?? 50;
  const ii = integralImage(g, width, height);
  const iw = width + 1;
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(height - 1, y + radius);
    for (let x = 0; x < width; x++) {
      const v = g[y * width + x];
      if (v <= hardDark) {
        mask[y * width + x] = 1;
        continue;
      }
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width - 1, x + radius);
      const area = (y1 - y0 + 1) * (x1 - x0 + 1);
      const sum =
        ii[(y1 + 1) * iw + (x1 + 1)] -
        ii[y0 * iw + (x1 + 1)] -
        ii[(y1 + 1) * iw + x0] +
        ii[y0 * iw + x0];
      if (v < sum / area - c) mask[y * width + x] = 1;
    }
  }
  return mask;
}
