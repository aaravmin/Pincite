import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { buildLatexBundle } from "@/features/exports/formats/latex-zip";
import type { DrawingFile, ExportContext } from "@/features/exports/types";
import { SECTION_KEYS, type SectionKey } from "@/features/projects/domain/sections";
import type { Project } from "@/features/projects/domain/types";
import type { Inventor } from "@/features/filing/domain/types";
import type { Attachment } from "@/features/drawings/domain/types";

/** A real 1x1 PNG, so pdf-lib can genuinely embed it into the figure PDF. */
const PNG = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
);
/** Not a decodable image, so the figure PDF cannot be built and the raw file is bundled. */
const NOT_AN_IMAGE = new Uint8Array([1, 2, 3, 4]);

const project: Project = {
  id: "p1",
  user_id: "u1",
  name: "Matter",
  patent_type: "utility",
  declared_status: "drafting",
  application_number: null,
  filing_date: null,
  applicant_name: null,
  applicant_is_inventor: true,
  applicant_is_juristic: false,
  entity_status: "large",
  client_name: null,
  matter_no: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const inventor: Inventor = {
  id: "i1",
  project_id: "p1",
  legal_name: "Ada Byron",
  residence: "London",
  mailing_address: "1 Analytical Way, London",
  citizenship: "GB",
  ord: 0,
  created_at: "2026-01-01T00:00:00Z",
};

function attachment(over: Partial<Attachment> & { id: string }): Attachment {
  return {
    project_id: "p1",
    kind: "drawing",
    view: "front",
    storage_path: `p1/${over.id}`,
    filename: `${over.id}.png`,
    mime: "image/png",
    size_bytes: 10,
    created_at: "2026-01-01T00:00:00Z",
    analysis: null,
    annotations: null,
    page_index: null,
    ...over,
  };
}

const emptySections = Object.fromEntries(
  SECTION_KEYS.map((k) => [k, ""]),
) as Record<SectionKey, string>;

function context(over: Partial<ExportContext> = {}): ExportContext {
  return {
    project,
    sections: {
      ...emptySections,
      title: "A molded fiber container",
      background: "Existing containers leak.",
      claims: "1. A container comprising a base.",
    },
    inventors: [inventor],
    attachments: [],
    title: "A molded fiber container",
    ...over,
  };
}

const drawing = (a: Attachment, bytes: Uint8Array): DrawingFile => ({
  attachment: a,
  bytes,
});

async function names(zipped: Uint8Array): Promise<string[]> {
  return Object.keys((await JSZip.loadAsync(zipped)).files);
}

async function tex(zipped: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(zipped);
  return zip.file("patent.tex")!.async("string");
}

describe("buildLatexBundle", () => {
  it("bundles patent.tex and the README with no figures", async () => {
    const zipped = await buildLatexBundle(context(), []);
    expect(await names(zipped)).toEqual(["patent.tex", "README.txt"]);
    const zip = await JSZip.loadAsync(zipped);
    expect(await zip.file("README.txt")!.async("string")).toContain(
      "Figures none were uploaded",
    );
  });

  it("bakes each drawing into a figure PDF, before patent.tex", async () => {
    const zipped = await buildLatexBundle(
      context({ attachments: [attachment({ id: "a1" })] }),
      [drawing(attachment({ id: "a1" }), PNG)],
    );
    expect(await names(zipped)).toEqual([
      "figures/",
      "figures/figure_01.pdf",
      "patent.tex",
      "README.txt",
    ]);
    const zip = await JSZip.loadAsync(zipped);
    const pdf = await zip.file("figures/figure_01.pdf")!.async("uint8array");
    expect(Buffer.from(pdf.subarray(0, 5)).toString("latin1")).toBe("%PDF-");
  });

  it("references each figure from patent.tex with its FIG. label and view phrase", async () => {
    const figs = [
      attachment({ id: "a1", view: "front" }),
      attachment({ id: "a2", view: "top" }),
    ];
    const body = await tex(
      await buildLatexBundle(
        context({ attachments: figs }),
        figs.map((f) => drawing(f, PNG)),
      ),
    );
    expect(body).toContain("\\includegraphics");
    expect(body).toContain("figures/figure_01.pdf");
    expect(body).toContain("figures/figure_02.pdf");
    expect(body).toContain("\\textbf{FIG. 1}");
    expect(body).toContain("\\textbf{FIG. 2}");
    expect(body).toContain(
      "FIG. 1 is a front elevational view of the invention and FIG. 2 is a top plan view of the invention.",
    );
  });

  it("falls back to the raw image when the figure PDF cannot be built", async () => {
    const jpeg = attachment({ id: "a1", mime: "image/jpeg", filename: "a1.jpg" });
    const zipped = await buildLatexBundle(context({ attachments: [jpeg] }), [
      drawing(jpeg, NOT_AN_IMAGE),
    ]);
    const list = await names(zipped);
    expect(list).toContain("figures/figure_01.jpg");
    expect(list).not.toContain("figures/figure_01.pdf");
    expect(await tex(zipped)).toContain("figures/figure_01.jpg");
  });

  it("skips a drawing pdflatex cannot include, and renumbers around it", async () => {
    const scan = attachment({ id: "a1", mime: "image/tiff", filename: "a1.tiff" });
    const png = attachment({ id: "a2" });
    const zipped = await buildLatexBundle(context({ attachments: [scan, png] }), [
      drawing(scan, NOT_AN_IMAGE),
      drawing(png, PNG),
    ]);
    const list = await names(zipped);
    expect(list).toContain("figures/figure_01.pdf");
    expect(list.filter((n) => n.startsWith("figures/figure_"))).toHaveLength(1);
  });

  it("typesets the matter's own text and inventors", async () => {
    const body = await tex(await buildLatexBundle(context(), []));
    expect(body).toContain("\\documentclass");
    expect(body).toContain("\\MakeUppercase{A molded fiber container}");
    expect(body).toContain("{\\normalsize Inventor(s) Ada Byron}");
    expect(body).toContain("\\psection{Background of the Invention}");
    expect(body).toContain("\\pclaim{A container comprising a base.}");
  });

  it("counts the bundled figures in the README", async () => {
    const fig = attachment({ id: "a1" });
    const zip = await JSZip.loadAsync(
      await buildLatexBundle(context({ attachments: [fig] }), [drawing(fig, PNG)]),
    );
    expect(await zip.file("README.txt")!.async("string")).toContain(
      "Figures 1 drawing file(s) are in figures/",
    );
  });
});
