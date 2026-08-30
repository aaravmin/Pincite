/**
 * Compute the responsive span to highlight inside a section's full_text (roadmap §4.5
 * "highlight" step). selectResponsivePassage does deterministic keyword-overlap passage
 * selection and returns character offsets into full_text so the evidence pane can wrap the
 * span in place.
 */

/**
 * True when a block of text is essentially just a cross-reference ("See MPEP Chapter
 * 2300.", "See MPEP § 1893.01(e).", "Note 37 CFR 1.104(a)(1)... See also..."). The MPEP
 * has hundreds of these pointer stubs; surfacing one as the answer - or highlighting one
 * inside a real section - is exactly the "go look in chapter 2300 yourself" experience we
 * never want. We cut from the first referral directive to the end and ask whether any
 * substantive text remained before it; a real definition ("A combination is an
 * organization...") keeps its substance, a pure pointer collapses to nothing.
 */
export function isPointerStub(text: string): boolean {
  const body = text.replace(/\[top\]/gi, "").trim();
  if (body.length === 0) return true; // [Reserved] / empty
  if (body.length > 240) return false; // long enough to carry real content
  const beforeReferral = body
    .replace(
      /\b(for\b[^.]*?,\s*)?(see|refer to|note|reference is made to)\b[\s\S]*$/i,
      "",
    )
    .trim();
  return beforeReferral.replace(/[^a-z]/gi, "").length < 20;
}

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

export function selectResponsivePassage(
  fullText: string,
  query: string,
): { start: number; end: number } | null {
  const ts = terms(query);
  if (ts.length === 0) return null;

  // Paragraphs with their offsets into full_text (structuredText separates with \n).
  // Rank by query-term overlap, but prefer a substantive paragraph over a pure
  // cross-reference: a "See MPEP Chapter 2300." line is only chosen if nothing with real
  // content matched. Compared as [substantive-first, then score, then length].
  let idx = 0;
  let best = { substantive: false, score: 0, start: 0, end: 0 };
  for (const line of fullText.split("\n")) {
    const start = idx;
    idx += line.length + 1; // account for the removed "\n"
    const text = line.trim();
    if (text.length < 12) continue;
    const low = line.toLowerCase();
    let score = 0;
    for (const t of ts) if (low.includes(t)) score++;
    if (score === 0) continue;
    const substantive = !isPointerStub(text);
    const better =
      substantive !== best.substantive
        ? substantive
        : score !== best.score
          ? score > best.score
          : line.length > best.end - best.start;
    if (better) best = { substantive, score, start, end: start + line.length };
  }
  return best.score > 0 ? { start: best.start, end: best.end } : null;
}
