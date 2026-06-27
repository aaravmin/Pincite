// Ingest MPEP section TEXT into mpep_sections + mpep_chunks (content only, no
// embeddings). Embeddings are added separately by scripts/embed-mpep.mjs once the
// Voyage account is off the throttled free tier. Source: official USPTO per-section
// HTML (Ninth Edition, Revision 01.2024).
//
// Usage:
//   node --env-file=.env.local scripts/ingest-mpep.mjs --subset [--truncate]
//   node --env-file=.env.local scripts/ingest-mpep.mjs --all [--truncate]
//   node --env-file=.env.local scripts/ingest-mpep.mjs s2111 s608
import pg from "pg";
import { parse } from "node-html-parser";

const EDITION = "Ninth Edition, Revision 01.2024";
const BASE = "https://www.uspto.gov/web/offices/pac/mpep";
const UA = "Mozilla/5.0 (Pincite MPEP ingest; legal research aid)";
const FETCH_DELAY_MS = 400;
const CHUNK_CHARS = 6000;

const SUBSET = ["s608", "s2111", "s2161", "s2163", "s2173", "s2181", "s2106"];

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

async function fetchText(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.text();
}

async function enumerateSectionFiles() {
  const files = new Set();
  for (let n = 100; n <= 2900; n += 100) {
    const ch = String(n).padStart(4, "0");
    try {
      const root = parse(await fetchText(`${BASE}/mpep-${ch}.html`));
      for (const a of root.querySelectorAll("a")) {
        const m = (a.getAttribute("href") || "").match(/(s\d+[a-z0-9]*)\.html/i);
        if (m) files.add(m[1].toLowerCase());
      }
      process.stdout.write(`  chapter ${ch}: ${files.size} files so far\r`);
      await sleep(FETCH_DELAY_MS);
    } catch {
      /* reserved chapter — skip */
    }
  }
  process.stdout.write("\n");
  return [...files];
}

function parseSectionFile(html) {
  const parts = html.split(/(?=<h1\b[^>]*class="[^"]*page-title)/i);
  const sections = [];
  for (const part of parts) {
    if (!/^<h1\b[^>]*page-title/i.test(part)) continue;
    const headMatch = part.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
    if (!headMatch) continue;
    const headText = parse(`<x>${headMatch[1]}</x>`).text.replace(/\s+/g, " ").trim();
    const m = headText.match(
      /^([0-9]+(?:\.[0-9]+)?(?:\([a-z0-9]+\))?)\s+(.*?)(?:\s*\[R-([0-9.]+)\])?\s*$/i,
    );
    if (!m) continue;
    const bodyHtml = part.slice(headMatch.index + headMatch[0].length);
    const full_text = parse(bodyHtml)
      .structuredText.replace(/\n{3,}/g, "\n\n")
      .trim();
    if (!full_text) continue;
    sections.push({
      section_number: m[1],
      title: m[2].trim() || null,
      revision_tag: m[3] ? `[R-${m[3]}]` : null,
      full_text,
    });
  }
  return sections;
}

function chunkText(text) {
  if (text.length <= CHUNK_CHARS) return [text];
  const units = text.split(/\n+/); // structuredText separates blocks with single \n
  const chunks = [];
  let cur = "";
  for (let u of units) {
    // Hard-split any single unit longer than the chunk budget (guarantees every
    // chunk stays well under voyage-law-2's 16k-token input limit).
    while (u.length > CHUNK_CHARS) {
      if (cur) {
        chunks.push(cur);
        cur = "";
      }
      chunks.push(u.slice(0, CHUNK_CHARS));
      u = u.slice(CHUNK_CHARS);
    }
    if (cur && cur.length + u.length + 1 > CHUNK_CHARS) {
      chunks.push(cur);
      cur = "";
    }
    cur = cur ? `${cur}\n${u}` : u;
  }
  if (cur) chunks.push(cur);
  return chunks;
}

async function storeSection(client, file, sec) {
  const chapterNum = sec.section_number.match(/^\d+/)?.[0];
  const chapter = chapterNum
    ? String(Math.ceil(Number(chapterNum) / 100) * 100)
    : null;
  const { rows } = await client.query(
    `insert into public.mpep_sections
       (section_number, title, chapter, revision_tag, edition, source_url, full_text, fetched_at)
     values ($1,$2,$3,$4,$5,$6,$7, now())
     on conflict (section_number) do update set
       title = excluded.title, chapter = excluded.chapter,
       revision_tag = excluded.revision_tag, edition = excluded.edition,
       source_url = excluded.source_url, full_text = excluded.full_text, fetched_at = now()
     returning id`,
    [
      sec.section_number,
      sec.title,
      chapter,
      sec.revision_tag,
      EDITION,
      `${BASE}/${file}.html`,
      sec.full_text,
    ],
  );
  const sectionId = rows[0].id;
  const chunks = chunkText(sec.full_text);
  await client.query(`delete from public.mpep_chunks where section_id = $1`, [
    sectionId,
  ]);
  for (let i = 0; i < chunks.length; i++) {
    await client.query(
      `insert into public.mpep_chunks (section_id, chunk_index, content) values ($1,$2,$3)`,
      [sectionId, i, chunks[i]],
    );
  }
  return chunks.length;
}

async function main() {
  const args = process.argv.slice(2);
  const truncate = args.includes("--truncate");
  let files;
  if (args.includes("--all")) {
    console.log("Enumerating all section files from chapter indexes...");
    files = await enumerateSectionFiles();
  } else if (args.includes("--subset") || args.every((a) => a.startsWith("--"))) {
    files = SUBSET;
  } else {
    files = args.filter((a) => !a.startsWith("--")).map((a) => a.replace(/\.html$/, ""));
  }
  console.log(`Ingesting TEXT for ${files.length} file(s). Edition: ${EDITION}`);

  const client = new pg.Client(dbConfig());
  await client.connect();
  let sections = 0;
  let chunks = 0;
  try {
    if (truncate) {
      await client.query("truncate public.mpep_chunks, public.mpep_sections cascade");
      console.log("Truncated mpep_chunks + mpep_sections.");
    }
    for (const file of files) {
      try {
        const secs = parseSectionFile(await fetchText(`${BASE}/${file}.html`));
        for (const sec of secs) {
          chunks += await storeSection(client, file, sec);
          sections++;
        }
        console.log(`  ${file}: ${secs.length} sections`);
        await sleep(FETCH_DELAY_MS);
      } catch (e) {
        console.error(`  ${file}: FAILED ${e.message}`);
      }
    }
  } finally {
    await client.end();
  }
  console.log(`Done. ${sections} sections, ${chunks} chunks (text). Embeddings: run embed-mpep.mjs.`);
}

await main();
