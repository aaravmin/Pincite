/**
 * Voyage embeddings client — voyage-law-2 (legal-tuned, 1024-dim, 16K-token input).
 * SERVER ONLY (reads VOYAGE_API_KEY). CONFIDENTIALITY: Voyage ZDR is an account-level
 * opt-out (no per-request signal); verify it in the dashboard. Until ZDR is confirmed
 * across vendors, embed only synthetic / non-confidential text. See docs/business-context.md.
 */

const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";
const MODEL = process.env.EMBEDDING_MODEL ?? "voyage-law-2";

export type EmbedInputType = "query" | "document";

type VoyageItem = { embedding: number[]; index: number };

export async function embed(
  texts: string[],
  inputType: EmbedInputType = "document",
): Promise<number[][]> {
  if (texts.length === 0) return [];
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error("VOYAGE_API_KEY is not set");

  const res = await fetch(VOYAGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model: MODEL, input: texts, input_type: inputType }),
  });
  if (!res.ok) {
    throw new Error(`Voyage ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { data?: VoyageItem[] };
  return (json.data ?? [])
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

/** Embed a single string. Defaults to the "query" input type for search use. */
export async function embedOne(
  text: string,
  inputType: EmbedInputType = "query",
): Promise<number[]> {
  const [vec] = await embed([text], inputType);
  return vec;
}
