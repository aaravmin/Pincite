/**
 * Keyless prior-art candidate discovery via the public Google Patents query endpoint.
 * SERVER ONLY. This is the fallback used when BigQuery credentials are not configured (or
 * the key file is missing), so "find similar patents" works on any machine with no setup
 * and no billing. It is the same Google Patents corpus BigQuery queries, reached through the
 * same public search the website uses. Privacy: we send only keywords derived from the
 * claims, never the full claim text.
 */
import type { Candidate } from "@/lib/patents/bigquery";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function strip(s: unknown): string {
  return String(s ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function searchCandidatesKeyless(params: {
  keywords: string[];
  limit?: number;
}): Promise<{ candidates: Candidate[] }> {
  const limit = Math.min(Math.max(params.limit ?? 15, 1), 30);
  const kws = [
    ...new Set(
      params.keywords.map((k) => k.toLowerCase().trim()).filter((k) => k.length > 2),
    ),
  ].slice(0, 8);
  if (kws.length === 0) return { candidates: [] };

  // The endpoint takes a url-encoded inner query string (the same one the site's search bar
  // builds): q=<terms>&num=<n>. We then url-encode that whole thing into the `url` param.
  const inner = `q=${kws.join(" ")}&num=${limit}`;
  const endpoint = `https://patents.google.com/xhr/query?url=${encodeURIComponent(
    inner,
  )}&exp=`;

  const res = await fetch(endpoint, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Google Patents search returned ${res.status}`);
  }
  const json = (await res.json()) as {
    results?: { cluster?: Array<{ result?: Array<{ patent?: Record<string, unknown> }> }> };
  };
  const rows = json?.results?.cluster?.[0]?.result ?? [];

  const candidates: Candidate[] = [];
  for (const r of rows) {
    const p = r.patent ?? {};
    const num = strip(p.publication_number);
    if (!num) continue;
    candidates.push({
      publication_number: num,
      title: strip(p.title) || null,
      // The snippet is a relevant excerpt; it stands in for the abstract for matching.
      abstract: strip(p.snippet) || null,
      source_url: `https://patents.google.com/patent/${num}/en`,
    });
  }
  return { candidates };
}
