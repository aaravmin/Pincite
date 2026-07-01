/**
 * Generate the specification as a USPTO-aligned DOCX: 37 CFR 1.77 section order, ALL-CAPS
 * headings, [0001]-style bold paragraph numbers across the description, claims + abstract
 * each starting on their own page, 1.5 line spacing, 12pt Times New Roman, US margins.
 * Filing the spec in DOCX avoids the non-DOCX surcharge ($86-$430).
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
} from "docx";
import type { SectionKey } from "@/lib/projects/sections";
import { sanitizeOutputText } from "@/lib/text/sanitize";

type SpecEntry = {
  key: SectionKey;
  heading: string;
  newPage?: boolean;
  numbered?: boolean;
};

// 37 CFR 1.77(b) order (the parts Pincite captures).
const SPEC_ORDER: SpecEntry[] = [
  { key: "title", heading: "TITLE OF THE INVENTION" },
  { key: "cross_reference", heading: "CROSS-REFERENCE TO RELATED APPLICATIONS" },
  {
    key: "gov_interest",
    heading:
      "STATEMENT REGARDING FEDERALLY SPONSORED RESEARCH OR DEVELOPMENT",
  },
  { key: "background", heading: "BACKGROUND OF THE INVENTION", numbered: true },
  { key: "summary", heading: "BRIEF SUMMARY OF THE INVENTION", numbered: true },
  {
    key: "brief_description_drawings",
    heading: "BRIEF DESCRIPTION OF THE DRAWINGS",
    numbered: true,
  },
  {
    key: "detailed_description",
    heading: "DETAILED DESCRIPTION OF THE INVENTION",
    numbered: true,
  },
  { key: "claims", heading: "CLAIMS", newPage: true },
  { key: "abstract", heading: "ABSTRACT OF THE DISCLOSURE", newPage: true },
];

function heading(text: string, pageBreakBefore?: boolean): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: sanitizeOutputText(text), allCaps: true })],
    pageBreakBefore,
    spacing: { before: 240, after: 120, line: 360, lineRule: "auto" },
  });
}

function para(
  text: string,
  opts?: { center?: boolean; numberLabel?: string },
): Paragraph {
  const children: TextRun[] = [];
  if (opts?.numberLabel)
    children.push(new TextRun({ text: `${opts.numberLabel} `, bold: true }));
  children.push(new TextRun(sanitizeOutputText(text)));
  return new Paragraph({
    children,
    alignment: opts?.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { after: 120, line: 360, lineRule: "auto" },
  });
}

export async function buildSpecDocx(
  sections: Record<string, string>,
): Promise<Buffer> {
  const children: Paragraph[] = [];
  let paraNo = 0;

  for (const s of SPEC_ORDER) {
    const content = (sections[s.key] ?? "").trim();
    children.push(heading(s.heading, s.newPage));

    if (!content) {
      children.push(para("Not Applicable."));
      continue;
    }

    if (s.key === "title") {
      children.push(para(content, { center: true }));
      continue;
    }
    if (s.key === "abstract") {
      children.push(para(content.replace(/\s*\n+\s*/g, " ")));
      continue;
    }

    const lines = content
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
    for (const line of lines) {
      if (s.numbered) {
        paraNo += 1;
        children.push(
          para(line, { numberLabel: `[${String(paraNo).padStart(4, "0")}]` }),
        );
      } else {
        children.push(para(line));
      }
    }
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Times New Roman", size: 24 } } },
    },
    sections: [
      {
        // US margins (twips): left 1", others 0.75".
        properties: {
          page: { margin: { top: 1080, bottom: 1080, left: 1440, right: 1080 } },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
