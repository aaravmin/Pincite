/**
 * Minimal claim parser: split the claims section into numbered claims, each into
 * preamble / transitional phrase / body (roadmap §4.1). Phase 1 needs only a robust
 * split for display as numbered rows; the deeper validation (antecedent basis,
 * single-sentence, dependency) lands in Phases 4–5. Operates on the raw plain-text
 * string so offsets remain meaningful.
 */

export type ParsedClaim = {
  number: number;
  preamble: string;
  transition: string | null;
  body: string;
  raw: string;
  /** Character offset of this claim's start within the claims section content. */
  start: number;
};

// Recognized transitional phrases, longest first so "consisting essentially of" wins
// over "consisting of" (MPEP 2111.03). Detection only; no judgment here.
const TRANSITIONS = [
  "consisting essentially of",
  "consisting of",
  "comprising",
  "including",
  "containing",
  "having",
  "wherein",
];

/** Split on a leading claim number like "1." / "12)" at the start of a line. */
export function parseClaims(content: string): ParsedClaim[] {
  if (!content.trim()) return [];

  const re = /(^|\n)\s*(\d{1,3})[.)]\s+/g;
  const starts: { number: number; index: number; textStart: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const numberStart = m.index + (m[1] ? m[1].length : 0);
    starts.push({
      number: Number(m[2]),
      index: numberStart,
      textStart: re.lastIndex,
    });
  }

  if (starts.length === 0) {
    // Unnumbered single claim - treat the whole thing as claim 1.
    return [{ number: 1, ...splitClaim(content), raw: content.trim(), start: 0 }];
  }

  return starts.map((s, i) => {
    const end = i + 1 < starts.length ? starts[i + 1].index : content.length;
    const raw = content.slice(s.textStart, end).trim();
    return { number: s.number, ...splitClaim(raw), raw, start: s.index };
  });
}

function splitClaim(text: string): {
  preamble: string;
  transition: string | null;
  body: string;
} {
  const lower = text.toLowerCase();
  let best: { phrase: string; at: number } | null = null;
  for (const phrase of TRANSITIONS) {
    const at = lower.indexOf(phrase);
    if (at !== -1 && (best === null || at < best.at)) best = { phrase, at };
  }
  if (!best) return { preamble: text.trim(), transition: null, body: "" };
  return {
    preamble: text.slice(0, best.at).trim(),
    transition: text.slice(best.at, best.at + best.phrase.length),
    body: text.slice(best.at + best.phrase.length).trim(),
  };
}
