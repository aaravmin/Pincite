/**
 * Trace one connected component into an SVG path that outlines its ink (holes included).
 *
 * We walk the boundary on the pixel-corner grid: every side of an ink pixel whose neighbour is
 * background is a unit boundary edge, oriented so the ink is always on its left. Stitching those
 * directed edges end-to-end yields one closed loop per boundary (the outer silhouette plus a loop
 * around every interior hole). Loops are then simplified (collinear-point drop + Ramer-Douglas-
 * Peucker) so a staircase of pixels becomes a few clean segments, and emitted as `M..L..Z`
 * subpaths. Rendering the path with fill-rule evenodd makes the hole loops carve out correctly.
 *
 * Coordinates are in the source image's pixel space, so an object's `d` sits exactly where it was
 * drawn; the editor moves/scales it with a transform layered on top, never by rewriting `d`.
 *
 * Pure and dependency-free.
 */
import type { Component } from "@/lib/vector/label";

type Pt = { x: number; y: number };

export type TracedObject = {
  d: string;
  bbox: { x: number; y: number; w: number; h: number };
  pointCount: number;
};

/** Direction code for a unit step: 0=E, 1=N(up), 2=W, 3=S(down). */
function dirCode(dx: number, dy: number): number {
  if (dx > 0) return 0;
  if (dy < 0) return 1;
  if (dx < 0) return 2;
  return 3;
}
// At a shared (pinch) vertex, prefer the leftmost turn so loops stay consistent and don't cross.
// Ranked by (candidateDir - incomingDir) mod 4: left turn, straight, right turn, reverse.
const TURN_RANK = [1, 0, 3, 2];

export function traceComponent(
  labels: Int32Array,
  width: number,
  height: number,
  comp: Component,
  epsilon = 1.2,
): TracedObject | null {
  const id = comp.id;
  const { minX, minY, maxX, maxY } = comp.bbox;
  const inside = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < width && y < height && labels[y * width + x] === id;

  // Directed boundary edges, ink-on-left. Corner grid is (width+1) x (height+1).
  const sx: number[] = [];
  const sy: number[] = [];
  const ex: number[] = [];
  const ey: number[] = [];
  const addEdge = (ax: number, ay: number, bx: number, by: number) => {
    sx.push(ax);
    sy.push(ay);
    ex.push(bx);
    ey.push(by);
  };
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (labels[y * width + x] !== id) continue;
      if (!inside(x, y - 1)) addEdge(x + 1, y, x, y); // top
      if (!inside(x - 1, y)) addEdge(x, y, x, y + 1); // left
      if (!inside(x, y + 1)) addEdge(x, y + 1, x + 1, y + 1); // bottom
      if (!inside(x + 1, y)) addEdge(x + 1, y + 1, x + 1, y); // right
    }
  }
  const m = sx.length;
  if (m === 0) return null;

  const cornerStride = width + 1;
  const startKey = (i: number) => sy[i] * cornerStride + sx[i];
  // Map each start corner to the edges leaving it.
  const outgoing = new Map<number, number[]>();
  for (let i = 0; i < m; i++) {
    const k = startKey(i);
    const arr = outgoing.get(k);
    if (arr) arr.push(i);
    else outgoing.set(k, [i]);
  }

  const used = new Uint8Array(m);
  const loops: Pt[][] = [];
  for (let s = 0; s < m; s++) {
    if (used[s]) continue;
    const loop: Pt[] = [{ x: sx[s], y: sy[s] }];
    let cur = s;
    used[cur] = 1;
    const guardLimit = m + 1;
    let guard = 0;
    while (guard++ < guardLimit) {
      loop.push({ x: ex[cur], y: ey[cur] });
      const atKey = ey[cur] * cornerStride + ex[cur];
      const cands = outgoing.get(atKey);
      if (!cands) break;
      const inDir = dirCode(ex[cur] - sx[cur], ey[cur] - sy[cur]);
      let next = -1;
      let bestRank = 99;
      for (const c of cands) {
        if (used[c]) continue;
        const rel = (dirCode(ex[c] - sx[c], ey[c] - sy[c]) - inDir + 4) % 4;
        const rank = TURN_RANK.indexOf(rel);
        if (rank < bestRank) {
          bestRank = rank;
          next = c;
        }
      }
      if (next === -1) break; // closed (returned to a fully-consumed corner)
      cur = next;
      used[cur] = 1;
    }
    if (loop.length >= 4) loops.push(loop);
  }
  if (loops.length === 0) return null;

  const parts: string[] = [];
  let pointCount = 0;
  for (const loop of loops) {
    const simplified = simplifyLoop(loop, epsilon);
    if (simplified.length < 3) continue;
    pointCount += simplified.length;
    let d = `M${simplified[0].x} ${simplified[0].y}`;
    for (let i = 1; i < simplified.length; i++) d += `L${simplified[i].x} ${simplified[i].y}`;
    parts.push(d + "Z");
  }
  if (parts.length === 0) return null;

  return {
    d: parts.join(""),
    bbox: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
    pointCount,
  };
}

/** Drop collinear points, then RDP-simplify a closed loop (first point repeated as last). */
function simplifyLoop(loop: Pt[], epsilon: number): Pt[] {
  // The trace repeats the start corner as the final point; treat it as closed.
  const pts = loop.slice(0, loop.length - 1);
  if (pts.length <= 4) return pts;
  const collapsed: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[(i - 1 + pts.length) % pts.length];
    const b = pts[i];
    const c = pts[(i + 1) % pts.length];
    // keep b unless a-b-c are collinear
    if ((b.x - a.x) * (c.y - a.y) !== (b.y - a.y) * (c.x - a.x)) collapsed.push(b);
  }
  if (collapsed.length <= 4) return collapsed;
  return rdpClosed(collapsed, epsilon);
}

function rdpClosed(pts: Pt[], epsilon: number): Pt[] {
  // Anchor RDP on point 0 and the point farthest from it, so the closed ring splits into two
  // open chains.
  const a = 0;
  let b = 0;
  let maxD = -1;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[0].x;
    const dy = pts[i].y - pts[0].y;
    const dd = dx * dx + dy * dy;
    if (dd > maxD) {
      maxD = dd;
      b = i;
    }
  }
  const chain1 = pts.slice(a, b + 1);
  const chain2 = pts.slice(b).concat(pts[0]);
  const s1 = rdp(chain1, epsilon);
  const s2 = rdp(chain2, epsilon);
  // s1 ends at b, s2 starts at b and ends at the start; drop the shared endpoints.
  return s1.slice(0, -1).concat(s2.slice(0, -1));
}

function rdp(pts: Pt[], epsilon: number): Pt[] {
  if (pts.length < 3) return pts.slice();
  const first = pts[0];
  const last = pts[pts.length - 1];
  let maxDist = -1;
  let idx = -1;
  for (let i = 1; i < pts.length - 1; i++) {
    const dist = perpDist(pts[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      idx = i;
    }
  }
  if (maxDist > epsilon && idx > 0) {
    const left = rdp(pts.slice(0, idx + 1), epsilon);
    const right = rdp(pts.slice(idx), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [first, last];
}

function perpDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / len;
}
