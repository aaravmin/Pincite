/**
 * Build the application as a LaTeX source document that typesets like a published US patent,
 * following the layout in Pupalaikis, "Writing a Patent Application in LaTeX and LyX" (the
 * uspatent class): a centered title and inventors, the 37 CFR 1.77 section order with centered
 * underlined headings, running [0001] paragraph numbers across the description, an auto
 * "Brief Description of the Drawings" run-on, "What is claimed is:" with auto-numbered claims,
 * the abstract, and the drawings each on their own page at the end.
 *
 * Self-contained: the layout macros are defined in the preamble over the standard article
 * class, so the .tex compiles with plain pdflatex or on Overleaf without the uspatent package.
 * Pure string builder; the route bundles this .tex with the figure files into a ZIP.
 */
import type { SectionKey } from "@/lib/projects/sections";

const SEC_TITLE: Partial<Record<SectionKey, string>> = {
  cross_reference: "Cross-Reference to Related Applications",
  gov_interest: "Statement Regarding Federally Sponsored Research or Development",
  background: "Background of the Invention",
  summary: "Brief Summary of the Invention",
  detailed_description: "Detailed Description of the Invention",
};
// The numbered body sections, in 37 CFR 1.77 order; paragraph numbers run continuously.
const NUMBERED_ORDER: SectionKey[] = [
  "cross_reference",
  "gov_interest",
  "background",
  "summary",
];

const VIEW_PHRASE: Record<string, string> = {
  perspective: "is a perspective view of the invention",
  top: "is a top plan view of the invention",
  bottom: "is a bottom view of the invention",
  front: "is a front elevational view of the invention",
  rear: "is a rear elevational view of the invention",
  left: "is a left side elevational view of the invention",
  right: "is a right side elevational view of the invention",
  section: "is a sectional view of the invention",
  exploded: "is an exploded perspective view of the invention",
};

/** The brief-description phrase for a figure, from its detected view (37 CFR 1.74). */
export function figureDescription(view: string | null): string {
  return VIEW_PHRASE[view ?? ""] ?? "is a view of the invention";
}

function esc(s: string): string {
  return s
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([&%$#_{}])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function paragraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Split claims text into individual claim bodies (multi-line safe), stripping the number. */
function splitClaims(text: string): string[] {
  return text
    .split(/(?=^\s*\d+\.\s)/m)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/^\d+\.\s*/, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

const PREAMBLE = String.raw`\documentclass[12pt]{article}
\usepackage[letterpaper,margin=1in]{geometry}
\usepackage{mathptmx}
\usepackage{graphicx}
\usepackage[normalem]{ulem}
\setlength{\parindent}{0pt}
\setlength{\parskip}{6pt}
\renewcommand{\baselinestretch}{1.4}
\newcounter{ppara}
\newcommand{\padpara}{\ifnum\value{ppara}<1000 0\fi\ifnum\value{ppara}<100 0\fi\ifnum\value{ppara}<10 0\fi\arabic{ppara}}
\newcommand{\ppar}[1]{\stepcounter{ppara}\par\noindent\textbf{[\padpara]}\quad #1\par}
\newcommand{\psection}[1]{\par\bigskip{\centering\bfseries\uline{#1}\par}\nobreak\medskip}
\newcounter{pclaim}
\newcommand{\pclaim}[1]{\stepcounter{pclaim}\par\noindent\arabic{pclaim}.\quad #1\par\medskip}`;

export function buildPatentLatex(opts: {
  sections: Record<string, string>;
  title: string;
  inventors: string[];
  figures: { file: string; label: string; description: string }[];
}): string {
  const { sections, title, inventors, figures } = opts;
  const L: string[] = [PREAMBLE, "\\begin{document}"];

  // Title block.
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

  const section = (key: SectionKey, numbered: boolean) => {
    const content = (sections[key] ?? "").trim();
    if (!content) return;
    L.push(`\\psection{${esc(SEC_TITLE[key] ?? key)}}`);
    for (const p of paragraphs(content)) {
      L.push(numbered ? `\\ppar{${esc(p)}}` : `${esc(p)}\\par`);
    }
  };

  for (const key of NUMBERED_ORDER) section(key, true);

  // Brief Description of the Drawings: auto from the figures, else the user's section text.
  if (figures.length > 0) {
    const items = figures.map((f) => `${esc(f.label)} ${esc(f.description)}`);
    const body =
      items.length === 1
        ? `${items[0]}.`
        : `${items.slice(0, -1).join("; ")}; and ${items[items.length - 1]}.`;
    L.push("\\psection{Brief Description of the Drawings}");
    L.push(
      `\\ppar{For a more complete understanding of the invention, reference is made to the following description and accompanying drawings, in which: ${body}}`,
    );
  } else {
    section("brief_description_drawings", true);
  }

  section("detailed_description", true);

  // Claims: own page, "What is claimed is:", auto-numbered.
  const claims = splitClaims(sections["claims"] ?? "");
  if (claims.length > 0) {
    L.push("\\clearpage");
    L.push("\\noindent What is claimed is:\\par\\medskip");
    for (const c of claims) L.push(`\\pclaim{${esc(c)}}`);
  }

  // Abstract: own page, unnumbered.
  const abstract = (sections["abstract"] ?? "").trim();
  if (abstract) {
    L.push("\\clearpage");
    L.push("\\psection{Abstract of the Disclosure}");
    for (const p of paragraphs(abstract)) L.push(`${esc(p)}\\par`);
  }

  // Drawings: each figure on its own page at the end (numerals + lead lines baked into the file).
  if (figures.length > 0) {
    L.push("\\clearpage");
    L.push("{\\centering\\bfseries DRAWINGS\\par}");
    for (const f of figures) {
      L.push("\\clearpage");
      if (title.trim()) {
        L.push(`{\\centering\\small ${esc(title.trim())}\\par}`);
      }
      L.push("\\vfill");
      L.push("\\begin{center}");
      L.push(
        `\\includegraphics[width=0.85\\textwidth,height=0.78\\textheight,keepaspectratio]{${f.file}}`,
      );
      L.push(`\\\\[8pt]\\textbf{${esc(f.label)}}`);
      L.push("\\end{center}");
      L.push("\\vfill");
    }
  }

  L.push("\\end{document}");
  return L.join("\n");
}

export function buildLatexReadme(figureCount: number): string {
  return [
    "Patent-format LaTeX export",
    "",
    "patent.tex typesets your application like a published patent: a centered title and",
    "inventors, the 37 CFR 1.77 section order with numbered [0001] paragraphs, an auto",
    "Brief Description of the Drawings, the claims after 'What is claimed is:', the abstract,",
    "and the drawings each on their own page at the end. The layout follows the uspatent",
    "guide (Pupalaikis) but is self-contained, so it needs no special LaTeX package.",
    "",
    "To produce a PDF:",
    "  - Easiest: upload this whole folder to overleaf.com and open patent.tex.",
    "  - Locally: run  pdflatex patent.tex  twice in this folder (twice so the [NNNN]",
    "    paragraph and figure references settle).",
    "",
    figureCount > 0
      ? `Figures: ${figureCount} drawing file(s) are in figures/ and are referenced by patent.tex. Each has your placed reference numerals and lead lines baked in, so the compiled PDF matches the Drawings step.`
      : "Figures: none were uploaded, so the drawings pages are omitted.",
    "",
    "Pincite does not file for you; this is a typeset copy of what you drafted.",
  ].join("\n");
}
