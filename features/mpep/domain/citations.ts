/**
 * Pure citation-pin handling - the display half of the anti-hallucination spine. Which
 * section numbers actually exist is a corpus question answered in
 * infrastructure; deciding what to do with the answer is this pure step: any pin that did
 * not resolve is nulled out, so no citation reaches the screen without real text behind it.
 */

/** Anything display-side that carries an optional MPEP pin (findings, rules, actions). */
export type Pinned = { mpep_section: string | null };

/**
 * Null out every pin that is not in `resolved`, leaving the item otherwise untouched.
 * Items with no pin, and items whose pin resolved, are returned as-is (same reference), so
 * this is safe to run over lists that are re-rendered.
 */
export function applyResolvedPins<T extends Pinned>(
  items: T[],
  resolved: ReadonlySet<string>,
): T[] {
  return items.map((item) =>
    item.mpep_section && !resolved.has(item.mpep_section)
      ? { ...item, mpep_section: null }
      : item,
  );
}

/** Every distinct pin present on the items - the set to validate against the corpus. */
export function collectPins(items: readonly Pinned[]): string[] {
  return [
    ...new Set(
      items.map((i) => i.mpep_section).filter((p): p is string => !!p),
    ),
  ];
}
