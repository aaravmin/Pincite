/**
 * Turn a VectorObject's transform into an SVG transform string. Geometry (`d`) stays in the
 * original trace coordinates; move/scale/rotate is layered on top and applied about the object's
 * own bbox centre, so scaling grows it in place rather than sliding it toward the origin. Identity
 * transform (tx=ty=0, sx=sy=1, rot=0) collapses to a no-op. Isomorphic (client + export use it).
 */
import type { VectorObject } from "@/lib/filing/types";

export function objectTransform(o: VectorObject): string {
  const { tx, ty, sx, sy, rot } = o.transform;
  if (tx === 0 && ty === 0 && sx === 1 && sy === 1 && rot === 0) return "";
  const cx = o.bbox.x + o.bbox.w / 2;
  const cy = o.bbox.y + o.bbox.h / 2;
  return (
    `translate(${round(tx)} ${round(ty)}) ` +
    `translate(${round(cx)} ${round(cy)}) rotate(${round(rot)}) ` +
    `scale(${round(sx)} ${round(sy)}) translate(${round(-cx)} ${round(-cy)})`
  );
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
