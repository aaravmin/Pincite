/**
 * Render the application as a typeset PDF that looks like a published US patent, using pdf-lib
 * (no server-side TeX engine). It mirrors the LaTeX export (lib/export/latex.ts): a centered
 * title and inventors, the 37 CFR 1.77 section order with centered underlined headings, running
 * [0001] paragraph numbers across the description, an auto Brief Description of the Drawings,
 * "What is claimed is:" with numbered claims, the abstract on its own page, and each drawing on
 * its own page at the end. This is what the LaTeX would look like compiled, so the Submission
 * step can show a real visual preview and offer a downloadable PDF.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { SectionKey } from "@/lib/projects/sections";

const BLACK = rgb(0, 0, 0);
const PAGE_W = 612; // US Letter, points
const PAGE_H = 792;
const MARGIN = 72; // 1 inch
const CONTENT_W = PAGE_W - MARGIN * 2;
const LINE = 1.45; // line-height multiplier (matches the LaTeX baselinestretch)

const SEC_TITLE: Partial<Record<SectionKey, string>> = {
  cross_reference: "Cross-Reference to Related Applications",
  gov_interest: "Statement Regarding Federally Sponsored Research or Development",
  background: "Background of the Invention",
  summary: "Brief Summary of the Invention",
  detailed_description: "Detailed Description of the Invention",
};
const NUMBERED_ORDER: SectionKey[] = [
  "cross_reference",
  "gov_interest",
  "background",
  "summary",
];

function paragraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitClaims(text: string): string[] {
  return text
    .split(/(?=^\s*\d+\.\s)/m)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/^\d+\.\s*/, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

// pdf-lib's standard fonts are WinAnsi-encoded and throw on characters outside that set
// (e.g. curly quotes, em dashes pasted from Word). Fold the common ones to ASCII so a real
// paste never crashes the export.
function sanitize(s: string): string {
  return s
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[   ]/g, " ")
    .replace(/[•‧]/g, "-")
    .replace(/[^\x00-\xFF]/g, "");
}

export async function buildPatentPdf(opts: {
  sections: Record<string, string>;
  title: string;
  inventors: string[];
  figures: { pdf: Uint8Array; label: string; description: string }[];
}): Promise<Uint8Array> {
  const { sections, title, inventors, figures } = opts;
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const newPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };

  const wrap = (
    text: string,
    f: PDFFont,
    size: number,
    width: number,
    firstReduce = 0,
  ): string[] => {
    const out: string[] = [];
    let line = "";
    let limit = width - firstReduce;
    for (const word of sanitize(text).split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (f.widthOfTextAtSize(next, size) > limit && line) {
        out.push(line);
        line = word;
        limit = width;
      } else {
        line = next;
      }
    }
    if (line) out.push(line);
    return out.length ? out : [""];
  };

  const centered = (text: string, f: PDFFont, size: number, gapAfter = 0) => {
    const t = sanitize(text);
    const w = f.widthOfTextAtSize(t, size);
    if (y < MARGIN + size) newPage();
    page.drawText(t, { x: (PAGE_W - w) / 2, y: y - size, size, font: f, color: BLACK });
    y -= size * LINE + gapAfter;
  };

  const heading = (text: string) => {
    const size = 12;
    const t = sanitize(text).toUpperCase();
    const w = bold.widthOfTextAtSize(t, size);
    // Keep the heading with at least one line of its body.
    if (y < MARGIN + size * 3) newPage();
    y -= 14; // space before
    const x = (PAGE_W - w) / 2;
    page.drawText(t, { x, y: y - size, size, font: bold, color: BLACK });
    page.drawLine({
      start: { x, y: y - size - 2 },
      end: { x: x + w, y: y - size - 2 },
      thickness: 0.75,
      color: BLACK,
    });
    y -= size * LINE + 6;
  };

  // A body paragraph. `number` prints a bold [0001] prefix at the margin with the first line
  // flowing after it; continuation lines return to the margin (full width), as in a patent.
  const body = (text: string, opts2?: { number?: number }) => {
    const size = 11;
    const lh = size * LINE;
    const prefix =
      opts2?.number != null ? `[${String(opts2.number).padStart(4, "0")}]` : null;
    const prefixW = prefix ? bold.widthOfTextAtSize(prefix, size) + 8 : 0;
    const lines = wrap(text, font, size, CONTENT_W, prefixW);
    for (let i = 0; i < lines.length; i++) {
      if (y < MARGIN + size) newPage();
      if (i === 0 && prefix) {
        page.drawText(prefix, { x: MARGIN, y: y - size, size, font: bold, color: BLACK });
        page.drawText(lines[0], {
          x: MARGIN + prefixW,
          y: y - size,
          size,
          font,
          color: BLACK,
        });
      } else {
        page.drawText(lines[i], { x: MARGIN, y: y - size, size, font, color: BLACK });
      }
      y -= lh;
    }
    y -= 6; // paragraph gap
  };

  const claim = (num: number, text: string) => {
    const size = 11;
    const lh = size * LINE;
    const prefix = `${num}.`;
    const prefixW = font.widthOfTextAtSize(prefix, size) + 8;
    const lines = wrap(text, font, size, CONTENT_W, prefixW);
    for (let i = 0; i < lines.length; i++) {
      if (y < MARGIN + size) newPage();
      if (i === 0) {
        page.drawText(prefix, { x: MARGIN, y: y - size, size, font, color: BLACK });
        page.drawText(lines[0], {
          x: MARGIN + prefixW,
          y: y - size,
          size,
          font,
          color: BLACK,
        });
      } else {
        page.drawText(lines[i], { x: MARGIN, y: y - size, size, font, color: BLACK });
      }
      y -= lh;
    }
    y -= 8;
  };

  // Title block.
  y -= 12;
  centered((title.trim() || "Title of the Invention").toUpperCase(), bold, 15, 4);
  if (inventors.length > 0) {
    centered(`Inventor(s): ${inventors.join("; ")}`, font, 11);
  }
  y -= 12;

  let paraNum = 0;
  const section = (key: SectionKey, numbered: boolean) => {
    const content = (sections[key] ?? "").trim();
    if (!content) return;
    heading(SEC_TITLE[key] ?? key);
    for (const p of paragraphs(content)) {
      if (numbered) body(p, { number: ++paraNum });
      else body(p);
    }
  };

  for (const key of NUMBERED_ORDER) section(key, true);

  // Brief Description of the Drawings: auto from the figures, else the user's section text.
  if (figures.length > 0) {
    const items = figures.map((f) => `${f.label} ${f.description}`);
    const run =
      items.length === 1
        ? `${items[0]}.`
        : `${items.slice(0, -1).join("; ")}; and ${items[items.length - 1]}.`;
    heading("Brief Description of the Drawings");
    body(
      `For a more complete understanding of the invention, reference is made to the following description and accompanying drawings, in which: ${run}`,
      { number: ++paraNum },
    );
  } else if ((sections["brief_description_drawings"] ?? "").trim()) {
    heading("Brief Description of the Drawings");
    for (const p of paragraphs(sections["brief_description_drawings"]))
      body(p, { number: ++paraNum });
  }

  section("detailed_description", true);

  // Claims: own page, "What is claimed is:", numbered.
  const claims = splitClaims(sections["claims"] ?? "");
  if (claims.length > 0) {
    newPage();
    page.drawText("What is claimed is:", {
      x: MARGIN,
      y: y - 11,
      size: 11,
      font,
      color: BLACK,
    });
    y -= 11 * LINE + 6;
    claims.forEach((c, i) => claim(i + 1, c));
  }

  // Abstract: own page, unnumbered.
  const abstract = (sections["abstract"] ?? "").trim();
  if (abstract) {
    newPage();
    heading("Abstract of the Disclosure");
    for (const p of paragraphs(abstract)) body(p);
  }

  // Drawings: each figure on its own page (numerals + lead lines already baked into each PDF).
  if (figures.length > 0) {
    newPage();
    centered("DRAWINGS", bold, 13);
    for (const f of figures) {
      const fp = doc.addPage([PAGE_W, PAGE_H]);
      if (title.trim()) {
        const t = sanitize(title.trim());
        const tw = font.widthOfTextAtSize(t, 10);
        fp.drawText(t, {
          x: (PAGE_W - tw) / 2,
          y: PAGE_H - MARGIN,
          size: 10,
          font,
          color: BLACK,
        });
      }
      const [emb] = await doc.embedPdf(f.pdf);
      const maxW = CONTENT_W;
      const maxH = PAGE_H - MARGIN * 2 - 50;
      const scale = Math.min(maxW / emb.width, maxH / emb.height, 1);
      const w = emb.width * scale;
      const h = emb.height * scale;
      const ix = (PAGE_W - w) / 2;
      const iy = (PAGE_H - h) / 2 + 14;
      fp.drawPage(emb, { x: ix, y: iy, width: w, height: h });
      const cap = sanitize(f.label);
      const cw = bold.widthOfTextAtSize(cap, 12);
      fp.drawText(cap, { x: (PAGE_W - cw) / 2, y: iy - 22, size: 12, font: bold, color: BLACK });
    }
  }

  return await doc.save();
}
