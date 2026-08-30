import { describe, expect, it } from "vitest";
import { buildLatexReadme, buildPatentLatex, figureDescription } from "@/features/exports/formats/latex";

const build = (opts: Partial<Parameters<typeof buildPatentLatex>[0]> = {}) =>
  buildPatentLatex({
    sections: {},
    title: "Adjustable mount for a display arm",
    inventors: [],
    figures: [],
    ...opts,
  });

describe("figureDescription", () => {
  it("maps each standard view to its brief-description phrase", () => {
    expect(figureDescription("perspective")).toBe("is a perspective view of the invention");
    expect(figureDescription("top")).toBe("is a top plan view of the invention");
    expect(figureDescription("bottom")).toBe("is a bottom view of the invention");
    expect(figureDescription("front")).toBe("is a front elevational view of the invention");
    expect(figureDescription("rear")).toBe("is a rear elevational view of the invention");
    expect(figureDescription("left")).toBe("is a left side elevational view of the invention");
    expect(figureDescription("right")).toBe("is a right side elevational view of the invention");
    expect(figureDescription("section")).toBe("is a sectional view of the invention");
    expect(figureDescription("exploded")).toBe("is an exploded perspective view of the invention");
  });

  it("falls back to a neutral phrase for an unset or unknown view", () => {
    expect(figureDescription(null)).toBe("is a view of the invention");
    expect(figureDescription("")).toBe("is a view of the invention");
    expect(figureDescription("isometric")).toBe("is a view of the invention");
  });
});

describe("buildPatentLatex - document shell", () => {
  it("emits a self-contained article-class document", () => {
    const tex = build();
    expect(tex.startsWith("\\documentclass[12pt]{article}")).toBe(true);
    expect(tex).toContain("\\usepackage[normalem]{ulem}");
    expect(tex).toContain("\\newcommand{\\psection}");
    expect(tex).toContain("\\newcommand{\\ppar}");
    expect(tex).toContain("\\newcommand{\\pclaim}");
    expect(tex).toContain("\\begin{document}");
    expect(tex.trimEnd().endsWith("\\end{document}")).toBe(true);
    expect(tex).not.toContain("uspatent");
  });

  it("uppercases the title in the title block", () => {
    expect(build()).toContain(
      "{\\large\\bfseries\\MakeUppercase{Adjustable mount for a display arm}}",
    );
  });

  it("falls back to a placeholder title", () => {
    expect(build({ title: "   " })).toContain(
      "{\\large\\bfseries\\MakeUppercase{Title of the invention}}",
    );
  });

  it("lists the inventors only when there are any", () => {
    expect(build({ inventors: ["Ada Byron", "Grace Hopper"] })).toContain(
      "{\\normalsize Inventor(s) Ada Byron, Grace Hopper}",
    );
    expect(build()).not.toContain("Inventor(s)");
  });
});

describe("buildPatentLatex - escaping and sanitization", () => {
  it("strips the banned punctuation before escaping", () => {
    const tex = build({ title: "Widget: a self-locking mount" });
    expect(tex).toContain("\\MakeUppercase{Widget a self locking mount}");
  });

  it("escapes the LaTeX special characters", () => {
    const tex = build({ sections: { background: "Cuts cost by 50% & $5 #1 _x {y}" } });
    expect(tex).toContain("Cuts cost by 50\\% \\& \\$5 \\#1 \\_x \\{y\\}");
  });

  it("escapes a backslash, a tilde and a caret", () => {
    const tex = build({ sections: { background: "path\\to ~x ^y" } });
    // Known quirk: the brace escape runs after the backslash escape, so the braces of
    // \textbackslash are themselves escaped. Pinned as current behavior.
    expect(tex).toContain(
      "path\\textbackslash\\{\\}to \\textasciitilde{}x \\textasciicircum{}y",
    );
  });
});

describe("buildPatentLatex - 1.77 body sections", () => {
  const sections = {
    cross_reference: "Claims priority to 63/000,001.",
    gov_interest: "Not applicable.",
    background: "First background paragraph.\nSecond background paragraph.",
    summary: "A summary.",
    detailed_description: "How to make and use it.",
  };

  it("emits the numbered sections in 1.77 order with numbered paragraphs", () => {
    const tex = build({ sections });
    const order = [
      "\\psection{Cross Reference to Related Applications}",
      "\\psection{Statement Regarding Federally Sponsored Research or Development}",
      "\\psection{Background of the Invention}",
      "\\psection{Brief Summary of the Invention}",
      "\\psection{Detailed Description of the Invention}",
    ];
    const positions = order.map((h) => tex.indexOf(h));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(tex).toContain("\\ppar{First background paragraph.}");
    expect(tex).toContain("\\ppar{Second background paragraph.}");
  });

  it("omits a section that has no content", () => {
    const tex = build({ sections: { background: "Only the background." } });
    expect(tex).not.toContain("Brief Summary of the Invention");
    expect(tex).not.toContain("Cross Reference to Related Applications");
  });

  it("heads the user's own drawings section with the raw section key when no figures exist", () => {
    const tex = build({ sections: { brief_description_drawings: "FIG. 1 is a view." } });
    expect(tex).toContain("\\psection{brief\\_description\\_drawings}");
    expect(tex).toContain("\\ppar{FIG. 1 is a view.}");
  });
});

describe("buildPatentLatex - brief description of the drawings", () => {
  const fig = (n: number, view: string) => ({
    file: `figures/fig${n}.png`,
    label: `FIG. ${n}`,
    description: figureDescription(view),
  });

  it("writes a single-figure run-on sentence", () => {
    const tex = build({ figures: [fig(1, "perspective")] });
    expect(tex).toContain("\\psection{Brief Description of the Drawings}");
    expect(tex).toContain(
      "in which FIG. 1 is a perspective view of the invention.}",
    );
  });

  it('joins two figures with "and"', () => {
    const tex = build({ figures: [fig(1, "perspective"), fig(2, "top")] });
    expect(tex).toContain(
      "in which FIG. 1 is a perspective view of the invention and FIG. 2 is a top plan view of the invention.}",
    );
  });

  it("comma-separates three figures and joins the last with and", () => {
    const tex = build({ figures: [fig(1, "front"), fig(2, "rear"), fig(3, "section")] });
    expect(tex).toContain(
      "in which FIG. 1 is a front elevational view of the invention, FIG. 2 is a rear elevational view of the invention and FIG. 3 is a sectional view of the invention.}",
    );
  });

  it("prefers the auto description over the user's drawings section", () => {
    const tex = build({
      figures: [fig(1, "top")],
      sections: { brief_description_drawings: "Handwritten figure list." },
    });
    expect(tex).toContain("\\psection{Brief Description of the Drawings}");
    expect(tex).not.toContain("Handwritten figure list.");
  });
});

describe("buildPatentLatex - claims", () => {
  it("starts a page, renumbers the claims and normalizes their whitespace", () => {
    const tex = build({
      sections: {
        claims:
          "1. A widget comprising:\n   a base; and\n   a lid.\n2. The widget of claim 1, wherein the base is round.",
      },
    });
    expect(tex).toContain("\\noindent What is claimed is\\par\\medskip");
    // The semicolon is banned output punctuation, so it is dropped by the sanitizer.
    expect(tex).toContain("\\pclaim{A widget comprising a base and a lid.}");
    expect(tex).toContain("\\pclaim{The widget of claim 1, wherein the base is round.}");
  });

  it("omits the claims page when there are no claims", () => {
    expect(build()).not.toContain("What is claimed is");
  });
});

describe("buildPatentLatex - abstract and drawings pages", () => {
  it("puts the abstract on its own unnumbered page", () => {
    const tex = build({ sections: { abstract: "A widget for mounting a display." } });
    expect(tex).toContain("\\psection{Abstract of the Disclosure}");
    expect(tex).toContain("A widget for mounting a display.\\par");
    expect(tex).not.toContain("\\ppar{A widget for mounting a display.}");
  });

  it("puts each figure on its own page with its caption and the title", () => {
    const tex = build({
      figures: [{ file: "figures/fig1.png", label: "FIG. 1", description: "is a view of the invention" }],
    });
    expect(tex).toContain("{\\centering\\bfseries DRAWINGS\\par}");
    expect(tex).toContain(
      "\\includegraphics[width=0.85\\textwidth,height=0.78\\textheight,keepaspectratio]{figures/fig1.png}",
    );
    expect(tex).toContain("\\\\[8pt]\\textbf{FIG. 1}");
    expect(tex).toContain("{\\centering\\small Adjustable mount for a display arm\\par}");
  });

  it("omits the drawings pages when there are no figures", () => {
    expect(build()).not.toContain("DRAWINGS");
  });
});

describe("buildLatexReadme", () => {
  it("explains both compile routes and carries no banned punctuation", () => {
    const readme = buildLatexReadme(2);
    expect(readme).toContain("overleaf.com");
    expect(readme).toContain("pdflatex patent.tex");
    expect(readme).toContain("Pincite does not file for you");
    expect(readme).not.toMatch(/[-‐-―−:;]/);
  });

  it("describes the bundled figures", () => {
    expect(buildLatexReadme(3)).toContain("Figures 3 drawing file(s) are in figures/");
  });

  it("says so when no figures were uploaded", () => {
    const readme = buildLatexReadme(0);
    expect(readme).toContain("Figures none were uploaded");
    expect(readme).not.toContain("drawing file(s)");
  });
});
