/**
 * Google Patents on BigQuery (`patents-public-data`) — candidate discovery (roadmap §4.6
 * step 2). SERVER ONLY. Privacy: we query by keywords/CPC derived from the claims, never
 * the full claim text, so invention text stays local.
 *
 * Cost: patent text columns are large, so every query carries a hard maximumBytesBilled
 * cap and reports bytesProcessed. If a query would exceed the cap it fails loudly rather
 * than silently burning the free tier. One query per search (roadmap guardrail).
 */
import { BigQuery } from "@google-cloud/bigquery";

export type Candidate = {
  publication_number: string;
  title: string | null;
  abstract: string | null;
  source_url: string;
};

const GB = 1024 ** 3;
// A title+abstract keyword scan of the research table is ~135 GB (~$0.82). Cap a bit
// above that so a real search runs but a runaway query still fails loudly.
const MAX_BYTES_BILLED = String(160 * GB);

let _client: BigQuery | null = null;
function client(): BigQuery {
  if (_client) return _client;

  // Production (e.g. Vercel) has no filesystem for a key file, so accept the whole
  // service-account JSON in an env var. Locally, fall back to the file path via ADC.
  const json = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (json) {
    let creds: { project_id?: string; client_email?: string; private_key?: string };
    try {
      creds = JSON.parse(json);
    } catch {
      throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON is set but is not valid JSON.");
    }
    if (!creds.client_email || !creds.private_key) {
      throw new Error(
        "GOOGLE_APPLICATION_CREDENTIALS_JSON is missing client_email or private_key.",
      );
    }
    _client = new BigQuery({
      projectId: creds.project_id,
      credentials: {
        client_email: creds.client_email,
        // Tolerate platforms that escape newlines in env values.
        private_key: creds.private_key.replace(/\\n/g, "\n"),
      },
    });
    return _client;
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    _client = new BigQuery();
    return _client;
  }

  throw new Error(
    "Set GOOGLE_APPLICATION_CREDENTIALS_JSON (production) or GOOGLE_APPLICATION_CREDENTIALS (local file path) for BigQuery.",
  );
}

export async function searchCandidates(params: {
  keywords: string[];
  limit?: number;
}): Promise<{ candidates: Candidate[]; bytesProcessed: number }> {
  const limit = Math.min(Math.max(params.limit ?? 15, 1), 50);
  const kws = [
    ...new Set(
      params.keywords.map((k) => k.toLowerCase().trim()).filter((k) => k.length > 2),
    ),
  ].slice(0, 8);
  if (kws.length === 0) return { candidates: [], bytesProcessed: 0 };

  const queryParams: Record<string, string> = {};
  kws.forEach((k, i) => (queryParams[`kw${i}`] = `%${k}%`));
  const cond = kws
    .map((_, i) => `(LOWER(title) LIKE @kw${i} OR LOWER(abstract) LIKE @kw${i})`)
    .join(" OR ");
  const scoreExpr = kws
    .map(
      (_, i) =>
        `CAST(LOWER(title) LIKE @kw${i} AS INT64) + CAST(LOWER(abstract) LIKE @kw${i} AS INT64)`,
    )
    .join(" + ");

  const query = `
    SELECT publication_number, title, abstract, url AS source_url,
           (${scoreExpr}) AS kw_score
    FROM \`patents-public-data.google_patents_research.publications\`
    WHERE STARTS_WITH(publication_number, 'US-') AND (${cond})
    ORDER BY kw_score DESC
    LIMIT ${limit}`;

  const [job] = await client().createQueryJob({
    query,
    location: "US",
    params: queryParams,
    maximumBytesBilled: MAX_BYTES_BILLED,
  });
  const [rows] = await job.getQueryResults();
  const bytesProcessed = Number(
    job.metadata?.statistics?.totalBytesProcessed ?? 0,
  );

  const candidates = rows.map((r: Record<string, unknown>) => {
    const num = String(r.publication_number ?? "");
    return {
      publication_number: num,
      title: (r.title as string) ?? null,
      abstract: (r.abstract as string) ?? null,
      source_url:
        (r.source_url as string) ??
        `https://patents.google.com/patent/${num.replace(/-/g, "")}`,
    };
  });
  return { candidates, bytesProcessed };
}
