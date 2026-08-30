/**
 * Guided auto-fix (Feature 4), the pure half: mark the flagged span, build the prompt, read
 * the model's answer, and place the accepted edit back into the section. Manual per finding,
 * never a magic wand - nothing here writes anything; the application layer decides.
 *
 * No I/O, so the tricky parts (which occurrence to replace, what a malformed model answer
 * means) are directly testable.
 */

/** The markers wrapped around the flagged span so the model fixes the right occurrence. */
export const SPAN_OPEN = "⟦";
export const SPAN_CLOSE = "⟧";

/** Longest note we keep from the model, so a runaway answer cannot fill the panel. */
const NOTE_MAX = 200;

export type ProposedFix = { before: string; after: string; note: string };

/**
 * The occurrence of `needle` in `hay` closest to `near`, or -1. Used to apply a fix to the
 * flagged span and not some other identical text elsewhere in the section.
 */
export function nearestIndex(hay: string, needle: string, near: number): number {
  let idx = hay.indexOf(needle);
  if (idx < 0) return -1;
  let best = idx;
  let bestDist = Math.abs(idx - near);
  while ((idx = hay.indexOf(needle, idx + 1)) >= 0) {
    const d = Math.abs(idx - near);
    if (d < bestDist) {
      best = idx;
      bestDist = d;
    }
  }
  return best;
}

/**
 * Wrap the flagged span in markers, clamping the offsets to the section so a stale finding
 * (the text shrank since it was recorded) still produces a well-formed prompt.
 */
export function markSpan(content: string, start: number, end: number): string {
  const s = Math.max(0, Math.min(content.length, start));
  const e = Math.max(s, Math.min(content.length, end));
  return `${content.slice(0, s)}${SPAN_OPEN}${content.slice(s, e)}${SPAN_CLOSE}${content.slice(e)}`;
}

/**
 * The one-defect fix prompt. The model returns an exact before/after substring pair so the UI
 * can show a real diff rather than a rewritten section the user has to re-read.
 */
export function buildFixPrompt(input: {
  label: string;
  title: string;
  explanation: string;
  cfrRef: string | null;
  marked: string;
}): { system: string; prompt: string } {
  const system =
    "You are a meticulous US patent drafting assistant. You fix exactly one flagged defect with the smallest possible edit and never change anything else.";
  const prompt = `A defect was flagged in the "${input.label}" section of a patent application.
Defect: ${input.title}. ${input.explanation}${input.cfrRef ? ` (${input.cfrRef})` : ""}
The flagged text is wrapped in ⟦ ⟧ markers in the section below. Fix ONLY that defect.

SECTION:
"""
${input.marked}
"""

Return ONLY a JSON object: {"before": "<exact contiguous substring of the ORIGINAL section to replace, copied verbatim, WITHOUT the markers>", "after": "<the corrected replacement>", "note": "<one short sentence describing the change>"}.
Rules:
- "before" must be an exact substring of the original section text (do not include the ⟦ ⟧ markers).
- Make the smallest change that fixes only this defect and copy everything else verbatim.
- Output JSON only, no commentary.`;
  return { system, prompt };
}

/**
 * Read the model's answer: take the first JSON object in the text, strip any span markers the
 * model copied into `before`, and cap the note. Returns null when there is nothing usable -
 * unparsable output, or an empty `before` - so the caller can say so instead of guessing.
 */
export function parseFixResponse(text: string): ProposedFix | null {
  const match = text.match(/\{[\s\S]*\}/);
  let raw: { before?: string; after?: string; note?: string } = {};
  try {
    raw = match ? JSON.parse(match[0]) : {};
  } catch {
    raw = {};
  }
  const before = String(raw.before ?? "").replace(
    new RegExp(`[${SPAN_OPEN}${SPAN_CLOSE}]`, "g"),
    "",
  );
  const after = String(raw.after ?? "");
  const note = String(raw.note ?? "").slice(0, NOTE_MAX);
  if (!before) return null;
  return { before, after, note };
}

/**
 * Apply an accepted edit to the occurrence of `before` nearest the flagged span. Returns null
 * when `before` is no longer present - the section changed since the fix was drafted, and
 * replacing blindly would corrupt it.
 */
export function applyReplacement(
  content: string,
  before: string,
  after: string,
  near: number,
): string | null {
  const idx = nearestIndex(content, before, near);
  if (idx < 0) return null;
  return content.slice(0, idx) + after + content.slice(idx + before.length);
}
