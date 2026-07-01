/**
 * Connected-component labeling of a bilevel ink mask (8-connectivity).
 *
 * Each maximal blob of touching ink pixels becomes one component, which downstream becomes one
 * independently movable/resizable/hideable object. 8-connectivity means diagonally-touching
 * strokes count as one piece, matching how a person reads a single drawn shape. Iterative
 * flood fill (an explicit stack, not recursion) keeps it safe on large images.
 *
 * Pure and dependency-free.
 */

export type Component = {
  id: number; // matches the value written into `labels`
  area: number; // ink pixel count
  bbox: { minX: number; minY: number; maxX: number; maxY: number }; // inclusive
};

export type LabelResult = {
  /** width*height; 0 = background, >=1 = component id. */
  labels: Int32Array;
  components: Component[];
};

export function connectedComponents(
  mask: Uint8Array,
  width: number,
  height: number,
): LabelResult {
  const labels = new Int32Array(width * height); // 0 = unlabeled/background
  const components: Component[] = [];
  const stack = new Int32Array(width * height); // reused LIFO of pixel indices
  let nextId = 0;

  for (let start = 0; start < mask.length; start++) {
    if (mask[start] === 0 || labels[start] !== 0) continue;
    nextId++;
    let sp = 0;
    stack[sp++] = start;
    labels[start] = nextId;
    let area = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    while (sp > 0) {
      const idx = stack[--sp];
      const x = idx % width;
      const y = (idx - x) / width;
      area++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      // 8 neighbors
      const x0 = x > 0 ? x - 1 : x;
      const x1 = x < width - 1 ? x + 1 : x;
      const y0 = y > 0 ? y - 1 : y;
      const y1 = y < height - 1 ? y + 1 : y;
      for (let ny = y0; ny <= y1; ny++) {
        for (let nx = x0; nx <= x1; nx++) {
          const nIdx = ny * width + nx;
          if (mask[nIdx] === 1 && labels[nIdx] === 0) {
            labels[nIdx] = nextId;
            stack[sp++] = nIdx;
          }
        }
      }
    }

    components.push({ id: nextId, area, bbox: { minX, minY, maxX, maxY } });
  }

  return { labels, components };
}
