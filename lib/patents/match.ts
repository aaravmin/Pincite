/**
 * Pinpoint matching + transparent scoring (roadmap §4.6 steps 4-5). For each user claim
 * limitation, find the candidate-patent passage with the strongest term overlap and
 * record it as a span. The overall score is a transparent composite of how many
 * limitations have a strong overlap and how strong those overlaps are - never a verdict.
 * This deterministic lexical pass works without embeddings; semantic alignment layers on
 * once the Voyage embedding path is enabled.
 */
import { stemmedTerms, type Limitation } from "@/lib/patents/extract";

export type SpanMatch = {
  userSpanStart: number;
  userSpanEnd: number;
  patentSpanText: string;
  overlapType: "lexical" | "claim_limitation";
  confidence: number; // 0..1
};

export type CandidateMatch = {
  spans: SpanMatch[];
  overallScore: number; // 0..1
  limitationsWithOverlap: number;
  totalLimitations: number;
};

const STRONG = 0.4; // term-overlap ratio to count a limitation as overlapping
const FULL_READ = 0.8; // ratio above which a passage appears to read on the whole limitation

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.;])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
}

export function matchCandidate(
  limitations: Limitation[],
  candidateText: string,
): CandidateMatch {
  const cand = sentences(candidateText);
  const candTerms = cand.map((s) => new Set(stemmedTerms(s)));
  const spans: SpanMatch[] = [];
  let withOverlap = 0;
  let total = 0;

  for (const lim of limitations) {
    const lt = new Set(stemmedTerms(lim.text));
    if (lt.size === 0) continue;
    total++;

    let best = { ratio: 0, idx: -1 };
    for (let i = 0; i < cand.length; i++) {
      let inter = 0;
      for (const t of lt) if (candTerms[i].has(t)) inter++;
      const ratio = inter / lt.size;
      if (ratio > best.ratio) best = { ratio, idx: i };
    }

    if (best.ratio >= STRONG && best.idx >= 0) {
      withOverlap++;
      spans.push({
        userSpanStart: lim.start,
        userSpanEnd: lim.end,
        patentSpanText: cand[best.idx],
        overlapType: best.ratio >= FULL_READ ? "claim_limitation" : "lexical",
        confidence: Number(best.ratio.toFixed(2)),
      });
    }
  }

  const fraction = total ? withOverlap / total : 0;
  const avgConf = spans.length
    ? spans.reduce((a, s) => a + s.confidence, 0) / spans.length
    : 0;
  const overallScore = Number((0.6 * fraction + 0.4 * avgConf).toFixed(2));

  return {
    spans,
    overallScore,
    limitationsWithOverlap: withOverlap,
    totalLimitations: total,
  };
}
