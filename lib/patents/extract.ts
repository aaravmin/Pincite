/**
 * Feature extraction for prior-art search (roadmap §4.6 step 1): parse the user's claims
 * into individual limitations (with character offsets into the claims section, so the
 * evidence pane can underline the exact element) and pull significant technical terms
 * for query building and overlap scoring.
 */
import { parseClaims } from "@/lib/patent/claims";

export type Limitation = {
  claimNumber: number;
  text: string;
  start: number; // offset into the claims section content
  end: number;
};

// Claim boilerplate + function words that are not technical signal.
const STOP = new Set([
  "the", "a", "an", "of", "to", "in", "and", "or", "for", "is", "are", "on", "at",
  "by", "as", "with", "from", "said", "wherein", "comprising", "comprises",
  "consisting", "including", "having", "claim", "according", "wherein", "being",
  "least", "one", "first", "second", "third", "plurality", "configured", "adapted",
  "thereof", "such", "that", "which", "each", "into", "between", "via", "device",
]);

export function significantTerms(text: string): string[] {
  const toks = text.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) ?? [];
  return toks.filter((t) => !STOP.has(t));
}

/** Distinct significant terms across all claims — used to build a candidate query. */
export function claimKeywords(claimsText: string, limit = 20): string[] {
  const counts = new Map<string, number>();
  for (const t of significantTerms(claimsText)) {
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([t]) => t);
}

function splitClauses(raw: string): { text: string; offset: number }[] {
  const res: { text: string; offset: number }[] = [];
  let idx = 0;
  for (const seg of raw.split(/;/)) {
    res.push({ text: seg, offset: idx });
    idx += seg.length + 1; // +1 for the removed ';'
  }
  return res;
}

export function extractLimitations(claimsText: string): Limitation[] {
  const claims = parseClaims(claimsText);
  const out: Limitation[] = [];
  for (const c of claims) {
    const searchFrom = c.start >= 0 ? c.start : 0;
    const rawStart = claimsText.indexOf(c.raw, searchFrom);
    const base = rawStart >= 0 ? rawStart : searchFrom;
    for (const cl of splitClauses(c.raw)) {
      const text = cl.text.trim();
      if (significantTerms(text).length < 2) continue;
      const localStart = cl.offset + (cl.text.length - cl.text.trimStart().length);
      const start = base + localStart;
      out.push({ claimNumber: c.number, text, start, end: start + text.length });
    }
  }
  return out;
}
