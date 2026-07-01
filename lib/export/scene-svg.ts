/**
 * Render an edited vector scene to a standalone SVG for export. The scene IS the drawing (traced
 * path objects with move/resize placement baked into a transform), so there is no embedded raster.
 * Hidden objects are dropped. Ink is black, matching filed patent line-art. Isomorphic and pure,
 * like `figure-svg.ts`, so it runs in the export route without any Node/DOM dependency.
 */
import { objectTransform } from "@/lib/vector/transform";
import type { VectorScene } from "@/lib/filing/types";

export function buildSceneSvg(scene: VectorScene): string {
  const W = scene.width;
  const H = scene.height;
  const parts: string[] = [];
  for (const o of scene.objects) {
    if (o.hidden || !o.d) continue;
    const t = objectTransform(o);
    const fill = o.fill === "none" ? "none" : "#000000";
    const stroke = o.stroke ? ` stroke="#000000" stroke-width="${o.stroke.width}"` : "";
    parts.push(
      `<path d="${o.d}"${t ? ` transform="${t}"` : ""} fill="${fill}" fill-rule="evenodd"${stroke}/>`,
    );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${parts.join("")}</svg>`;
}
