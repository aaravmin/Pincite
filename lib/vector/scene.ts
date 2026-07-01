/**
 * Orchestrate the vectorization pipeline into an editable `VectorScene`: decode -> binarize ->
 * label connected components -> trace each into a path object. Every object is a separate ink
 * island the user can move, resize, hide, or delete. Server-only (pulls in the canvas decoder).
 */
import "server-only";
import { decodeImageToRgba, rasterizePdfPage } from "@/lib/vector/rasterize";
import { toBilevel } from "@/lib/vector/binarize";
import { connectedComponents } from "@/lib/vector/label";
import { traceComponent } from "@/lib/vector/trace";
import type { VectorObject, VectorScene } from "@/lib/filing/types";

// Ink islands smaller than this (post-downscale pixels) are speckle, not strokes; dropped.
const MIN_AREA = 12;
// Hard cap so a pathologically busy scan can't produce an unworkable scene. We keep the largest
// objects (the real strokes) and note the rest were dropped.
const MAX_OBJECTS = 4000;

const identity = () => ({ tx: 0, ty: 0, sx: 1, sy: 1, rot: 0 });

export type SceneBuild = { scene: VectorScene; droppedSmall: number; droppedCap: number };

export async function buildSceneFromImage(
  bytes: Uint8Array,
  tracedAt: string,
): Promise<SceneBuild> {
  const { rgba, width, height } = await decodeImageToRgba(bytes);
  return buildSceneFromRgba(rgba, width, height, tracedAt, 0, "image");
}

export async function buildSceneFromPdf(
  bytes: Uint8Array,
  tracedAt: string,
  pageIndex = 0,
): Promise<SceneBuild> {
  const { rgba, width, height } = await rasterizePdfPage(bytes, pageIndex);
  return buildSceneFromRgba(rgba, width, height, tracedAt, pageIndex, "pdf");
}

/** Shared core, reused by the PDF path once a page is rasterized to RGBA. */
export function buildSceneFromRgba(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  tracedAt: string,
  pageIndex: number,
  kind: "image" | "pdf",
): SceneBuild {
  const mask = toBilevel(rgba, width, height);
  const { labels, components } = connectedComponents(mask, width, height);

  const big = components.filter((c) => c.area >= MIN_AREA);
  const droppedSmall = components.length - big.length;
  big.sort((a, b) => b.area - a.area);
  const droppedCap = Math.max(0, big.length - MAX_OBJECTS);
  const kept = big.slice(0, MAX_OBJECTS);

  const objects: VectorObject[] = [];
  let z = 0;
  for (const comp of kept) {
    const traced = traceComponent(labels, width, height, comp);
    if (!traced) continue;
    objects.push({
      id: `o${comp.id}`,
      d: traced.d,
      bbox: traced.bbox,
      transform: identity(),
      hidden: false,
      z: z++,
      source: "trace",
      fill: "#000000",
      stroke: null,
    });
  }

  const scene: VectorScene = {
    version: 1,
    width,
    height,
    objects,
    source: { kind, pageIndex, tracedAt },
  };
  return { scene, droppedSmall, droppedCap };
}
