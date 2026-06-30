/**
 * Build the application as a LaTeX source document that typesets like a published patent:
 * a centered title and inventors, 37 CFR 1.77 section order with ALL-CAPS headings, running
 * [0001]-style paragraph numbers across the description, the claims, the abstract, and the
 * drawings each on their own page. Compile with pdflatex (or Overleaf) to a PDF. Pure string
 * builder - the route bundles this .tex with the figure files into a ZIP.
 */
import type { SectionKey } from "@/lib/projects/sections";

type SpecEntry = { key: SectionKey; heading: string; numbered?: boolean; newPage?: boolean };

// 37 CFR 1.77(b) order; the title is rendered as the centered header, not a body section.
const SPEC_ORDER: SpecEntry[] = [
  { key: "cross_reference", heading: "Cross-reference to related applications" },
  {
    key: "gov_interest",
    heading: "Statement regarding federally sponsored research or development",
  },
  { key: "background", heading: "Background of the invention", numbered: true },
  { key: "summary", heading: "Brief summary of the invention", numbered: true },
  {
    key: "brief_description_drawings",
    heading: "Brief description of the drawings",
    numbered: true,
  },
  {
    key: "detailed_description",
    heading: "Detailed description of the invention",
    numbered: true,
  },
  { key: "claims", heading: "Claims", newPage: true },
  { key: "abstract", heading: "Abstract of the disclosure", newPage: true },
];

function esc(s: string): string {
  return s
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([&%$#_{}])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

/** Split a plain-text section into paragraphs (one per non-empty line/block). */
function paragraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function buildPatentLatex(opts: {
  sections: Record<string, string>;
  title: string;
  inventors: string[];
  figures: { file: string; label: string }[];
}): string {
  const { sections, title, inventors, figures } = opts;
  const L: string[] = [];
  L.push("\\documentclass[12pt]{article}");
  L.push("\\usepackage[letterpaper,margin=1in]{geometry}");
  L.push("\\usepackage{mathptmx}"); // Times-like roman, the patent norm
  L.push("\\usepackage{graphicx}");
  L.push("\\setlength{\\parindent}{0pt}");
  L.push("\\setlength{\\parskip}{6pt}");
  L.push("\\renewcommand{\\baselinestretch}{1.4}");
  L.push("\\begin{document}");

  L.push("\\begin{center}");
  L.push(
    `{\\large\\bfseries\\MakeUppercase{${esc(title.trim() || "Title of the invention")}}}`,
  );
  if (inventors.length > 0) {
    L.push("\\\\[8pt]");
    L.push(`{\\normalsize Inventor(s): ${esc(inventors.join("; "))}}`);
  }
  L.push("\\end{center}");
  L.push("\\vspace{12pt}");

  let pn = 0;
  const num = (n: number) => `[${String(n).padStart(4, "0")}]`;
  for (const e of SPEC_ORDER) {
    const content = (sections[e.key] ?? "").trim();
    if (!content) continue;
    if (e.newPage) L.push("\\newpage");
    L.push(`\\begin{center}\\textbf{\\MakeUppercase{${esc(e.heading)}}}\\end{center}`);
    if (e.key === "claims") L.push("What is claimed is:\\par\\medskip");
    for (const p of paragraphs(content)) {
      if (e.numbered) {
        pn++;
        L.push(`\\textbf{${num(pn)}}\\quad ${esc(p)}\\par`);
      } else {
        L.push(`${esc(p)}\\par`);
      }
    }
  }

  if (figures.length > 0) {
    L.push("\\newpage");
    L.push("\\begin{center}\\textbf{DRAWINGS}\\end{center}");
    for (const f of figures) {
      L.push("\\begin{figure}[ht]\\centering");
      L.push(
        `\\includegraphics[width=0.85\\textwidth,height=0.8\\textheight,keepaspectratio]{${f.file}}`,
      );
      L.push(`\\\\[6pt]\\textbf{${esc(f.label)}}`);
      L.push("\\end{figure}");
      L.push("\\clearpage");
    }
  }

  L.push("\\end{document}");
  return L.join("\n");
}

export function buildLatexReadme(figureCount: number): string {
  return [
    "Patent-format LaTeX export",
    "",
    "patent.tex typesets your application like a published patent: centered title and",
    "inventors, the 37 CFR 1.77 section order, numbered [0001] paragraphs, the claims and",
    "abstract on their own pages, and the drawings at the end.",
    "",
    "To produce a PDF:",
    "  - Easiest: upload this whole folder to overleaf.com and open patent.tex.",
    "  - Locally: run  pdflatex patent.tex  twice in this folder.",
    "",
    figureCount > 0
      ? `Figures: ${figureCount} drawing file(s) are in figures/ and are referenced by patent.tex. These are your uploaded images. To use a marked-up figure instead, export it from the Drawings step (Export PNG) and replace the matching file in figures/.`
      : "Figures: none were uploaded, so the drawings page is omitted.",
    "",
    "Pincite does not file for you; this is a typeset copy of what you drafted.",
  ].join("\n");
}
