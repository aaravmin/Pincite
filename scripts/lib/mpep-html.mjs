// The MPEP source and parser, shared by scripts/ingest-mpep.mjs (the live corpus) and
// scripts/build-demo-fixture.mjs (the demo corpus), so both turn the official USPTO
// per-section HTML (Ninth Edition, Revision 01.2024) into exactly the same rows.
import { parse } from "node-html-parser";

export const EDITION = "Ninth Edition, Revision 01.2024";
export const BASE = "https://www.uspto.gov/web/offices/pac/mpep";
const UA = "Mozilla/5.0 (Pincite MPEP ingest; legal research aid)";
export const FETCH_DELAY_MS = 400;

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** GET a page as text with the ingest User-Agent; `init` can add a signal or headers. */
export async function fetchText(url, init = {}) {
  const r = await fetch(url, {
    ...init,
    headers: { "User-Agent": UA, ...(init.headers ?? {}) },
  });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.text();
}

export function parseSectionFile(html) {
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

// The value stored in mpep_sections.chapter. It rounds UP to the next hundred, so a section
// inside a chapter is filed under the following one (608.01(n) -> "700", 2173 -> "2200");
// only an exact hundred maps to itself. Nothing reads the column today. Kept exactly as the
// live ingest has always written it, so the demo corpus matches the production rows.
export function chapterOf(sectionNumber) {
  const chapterNum = sectionNumber.match(/^\d+/)?.[0];
  return chapterNum
    ? String(Math.ceil(Number(chapterNum) / 100) * 100)
    : null;
}
