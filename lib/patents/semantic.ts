/**
 * Semantic ranking for prior art. The deterministic lexical pass (lib/patents/match.ts)
 * finds pinpoint overlaps; this layer scores how semantically close each candidate is to
 * the user's claims so candidates can be ranked beyond literal term overlap. One batched
 * Voyage call per search. Returns [] on any failure so the caller stays on the lexical score.
 */
import { embed } from "@/lib/embeddings/voyage";

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Cosine similarity (0..1) of the user's text against each candidate text. */
export async function semanticScores(
  userText: string,
  candidateTexts: string[],
): Promise<number[]> {
  if (!userText.trim() || candidateTexts.length === 0) return [];
  try {
    const vecs = await embed([userText, ...candidateTexts], "document");
    const u = vecs[0];
    if (!u) return [];
    return candidateTexts.map((_, i) => {
      const v = vecs[i + 1];
      return v ? Math.max(0, cosine(u, v)) : 0;
    });
  } catch {
    return [];
  }
}
