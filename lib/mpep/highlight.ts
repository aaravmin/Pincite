/**
 * Compute the responsive span to highlight inside a section's full_text (roadmap §4.5
 * "highlight" step). Two strategies:
 *  - findSpan: locate a verbatim quote (used when a model returns an anchor quote).
 *  - selectResponsivePassage: deterministic keyword-overlap passage selection (used now,
 *    before semantic ranking is available). Returns character offsets into full_text so
 *    the evidence pane can wrap the span in place.
 */

const STOP = new Set([
  "the", "a", "an", "of", "to", "in", "and", "or", "for", "is", "are", "on",
  "that", "this", "with", "as", "by", "be", "it", "at", "from", "which", "under",
  "when", "what", "does", "do", "how", "may", "must", "mpep", "section", "claim",
  "claims", "patent",
]);

function terms(query: string): string[] {
  const found = query.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return [...new Set(found)].filter((t) => t.length > 2 && !STOP.has(t));
}

export function findSpan(
  fullText: string,
  quote: string,
): { start: number; end: number } | null {
  const q = quote?.trim();
  if (!q) return null;
  const i = fullText.indexOf(q);
  if (i >= 0) return { start: i, end: i + q.length };
  return null;
}

export function selectResponsivePassage(
  fullText: string,
  query: string,
): { start: number; end: number } | null {
  const ts = terms(query);
  if (ts.length === 0) return null;

  // Paragraphs with their offsets into full_text (structuredText separates with \n).
  let idx = 0;
  let best = { score: 0, start: 0, end: 0 };
  for (const line of fullText.split("\n")) {
    const start = idx;
    idx += line.length + 1; // account for the removed "\n"
    const text = line.trim();
    if (text.length < 12) continue;
    const low = line.toLowerCase();
    let score = 0;
    for (const t of ts) if (low.includes(t)) score++;
    if (score > best.score) best = { score, start, end: start + line.length };
  }
  return best.score > 0 ? { start: best.start, end: best.end } : null;
}
