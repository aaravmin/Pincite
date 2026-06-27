// Embedding pass for the MPEP corpus: finds mpep_chunks with a NULL embedding and
// fills them using voyage-law-2 (1024-dim). Resumable — re-run until none remain.
// Requires the Voyage account to be off the throttled free tier (add a payment method
// at dashboard.voyageai.com; the 200M free tokens still cover the MPEP).
//
// Usage: node --env-file=.env.local scripts/embed-mpep.mjs
import pg from "pg";

const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";
const MODEL = process.env.EMBEDDING_MODEL || "voyage-law-2";
const BATCH = 32; // chunks per Voyage call (sum kept well under the 120k-token batch cap)
const MAX_BATCH_CHARS = 280_000; // ~70k tokens, safe margin
const MAX_RETRIES = 6;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function dbConfig() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error("SUPABASE_DB_URL not set");
  if (process.env.SUPABASE_DB_PASSWORD) {
    const x = new URL(url);
    return {
      host: x.hostname,
      port: Number(x.port || "5432"),
      user: decodeURIComponent(x.username),
      database: x.pathname.replace(/^\//, "") || "postgres",
      password: process.env.SUPABASE_DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
    };
  }
  return { connectionString: url, ssl: { rejectUnauthorized: false } };
}

async function embedBatch(texts) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const r = await fetch(VOYAGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({ model: MODEL, input: texts, input_type: "document" }),
    });
    if (r.ok) {
      const json = await r.json();
      return (json.data ?? [])
        .slice()
        .sort((a, b) => a.index - b.index)
        .map((d) => d.embedding);
    }
    const body = await r.text();
    if (r.status === 429 && attempt < MAX_RETRIES) {
      const wait = Math.min(60_000, 5_000 * 2 ** attempt);
      console.error(`  Voyage 429 (rate limited); waiting ${wait / 1000}s then retrying...`);
      await sleep(wait);
      continue;
    }
    throw new Error(`Voyage ${r.status}: ${body}`);
  }
  throw new Error("Voyage: exhausted retries");
}

function nextBatch(rows) {
  const batch = [];
  let chars = 0;
  for (const row of rows) {
    if (batch.length >= BATCH) break;
    if (batch.length && chars + row.content.length > MAX_BATCH_CHARS) break;
    batch.push(row);
    chars += row.content.length;
  }
  return batch;
}

async function main() {
  if (!process.env.VOYAGE_API_KEY) throw new Error("VOYAGE_API_KEY not set");
  const client = new pg.Client(dbConfig());
  await client.connect();
  let done = 0;
  try {
    const { rows: countRow } = await client.query(
      "select count(*)::int n from public.mpep_chunks where embedding is null",
    );
    const total = countRow[0].n;
    console.log(`${total} chunk(s) need embeddings.`);
    if (total === 0) return;

    for (;;) {
      const { rows } = await client.query(
        "select id, content from public.mpep_chunks where embedding is null order by id limit 200",
      );
      if (rows.length === 0) break;
      let i = 0;
      while (i < rows.length) {
        const batch = nextBatch(rows.slice(i));
        if (batch.length === 0) break;
        const vecs = await embedBatch(batch.map((b) => b.content));
        for (let j = 0; j < batch.length; j++) {
          await client.query(
            "update public.mpep_chunks set embedding = $1 where id = $2",
            [`[${vecs[j].join(",")}]`, batch[j].id],
          );
        }
        done += batch.length;
        i += batch.length;
        process.stdout.write(`  embedded ${done}/${total}\r`);
      }
    }
    process.stdout.write("\n");
  } finally {
    await client.end();
  }
  console.log(`Done. Embedded ${done} chunk(s).`);
}

await main();
