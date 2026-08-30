import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { buildFilingPackageZip } from "@/features/exports/formats/package-zip";
import type { DrawingFile, ExportContext } from "@/features/exports/types";
import type { SectionKey } from "@/features/projects/domain/sections";
import { SECTION_KEYS } from "@/features/projects/domain/sections";
import type { Project } from "@/features/projects/domain/types";
import type { Inventor } from "@/features/filing/domain/types";
import type { Attachment } from "@/features/drawings/domain/types";

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
    sections: { ...emptySections, title: "Adjustable mount" },
    inventors: [inventor],
    attachments: [],
    title: "Adjustable mount",
    ...over,
  };
}

const bytes = (n: number) => new Uint8Array([n, n + 1, n + 2]);
const file = (a: Attachment, n: number): DrawingFile => ({
  attachment: a,
  bytes: bytes(n),
});

async function names(zipped: Uint8Array): Promise<string[]> {
  const zip = await JSZip.loadAsync(zipped);
  return Object.keys(zip.files);
}

describe("buildFilingPackageZip", () => {
  it("writes the filing documents in order, even with nothing uploaded", async () => {
    expect(await names(await buildFilingPackageZip(context(), [], []))).toEqual([
      "specification.docx",
      "application_data_sheet.txt",
      "inventor_declaration.txt",
      "transmittal_and_fees.txt",
      "README.txt",
    ]);
  });

  it("places the drawings and the declarations in their folders", async () => {
    const fig = attachment({ id: "a1" });
    const decl = attachment({
      id: "d1",
      kind: "declaration",
      filename: "signed-declaration.pdf",
      mime: "application/pdf",
    });
    const zipped = await buildFilingPackageZip(
      context({ attachments: [fig, decl] }),
      [file(fig, 1)],
      [{ name: "signed_declaration.pdf", bytes: bytes(9) }],
    );
    // JSZip writes an entry for each folder it creates, as it always has.
    expect(await names(zipped)).toEqual([
      "specification.docx",
      "application_data_sheet.txt",
      "declarations/",
      "declarations/signed_declaration.pdf",
      "inventor_declaration.txt",
      "transmittal_and_fees.txt",
      "drawings/",
      "drawings/figure_01.png",
      "README.txt",
    ]);
  });

  it("stores the uploaded drawing bytes verbatim", async () => {
    const fig = attachment({ id: "a1" });
    const zipped = await buildFilingPackageZip(
      context({ attachments: [fig] }),
      [file(fig, 7)],
      [],
    );
    const zip = await JSZip.loadAsync(zipped);
    const out = await zip.file("drawings/figure_01.png")!.async("uint8array");
    expect([...out]).toEqual([7, 8, 9]);
  });

  it("numbers the drawings by their position among all drawings", async () => {
    const figs = [
      attachment({ id: "a1" }),
      attachment({ id: "a2" }),
      attachment({ id: "a3" }),
    ];
    const zipped = await buildFilingPackageZip(
      context({ attachments: figs }),
      figs.map((f, i) => file(f, i)),
      [],
    );
    const list = await names(zipped);
    expect(list).toContain("drawings/figure_01.png");
    expect(list).toContain("drawings/figure_02.png");
    expect(list).toContain("drawings/figure_03.png");
  });

  it("leaves a gap rather than renumbering when a drawing cannot be read", async () => {
    const figs = [attachment({ id: "a1" }), attachment({ id: "a2" })];
    // a1's bytes are missing, so only a2 is written - and it stays figure_02.
    const zipped = await buildFilingPackageZip(
      context({ attachments: figs }),
      [file(figs[1], 4)],
      [],
    );
    const list = await names(zipped);
    expect(list).toContain("drawings/figure_02.png");
    expect(list).not.toContain("drawings/figure_01.png");
  });

  it("keeps the extension that matches the upload's type", async () => {
    const figs = [
      attachment({ id: "a1", mime: "image/jpeg", filename: "a1.jpeg" }),
      attachment({ id: "a2", mime: "application/pdf", filename: "a2.pdf" }),
      attachment({ id: "a3", mime: "image/tiff", filename: "Scan.TIFF" }),
      attachment({ id: "a4", mime: "image/tiff", filename: "noextension" }),
    ];
    const zipped = await buildFilingPackageZip(
      context({ attachments: figs }),
      figs.map((f, i) => file(f, i)),
      [],
    );
    const list = await names(zipped);
    expect(list).toContain("drawings/figure_01.jpg");
    expect(list).toContain("drawings/figure_02.pdf");
    expect(list).toContain("drawings/figure_03.tiff");
    expect(list).toContain("drawings/figure_04.noextension");
  });

  it("names every declaration on the matter in the cover sheet, read or not", async () => {
    const declarations = [
      attachment({
        id: "d1",
        kind: "declaration",
        filename: "signed-declaration.pdf",
        mime: "application/pdf",
      }),
      attachment({
        id: "d2",
        kind: "declaration",
        filename: "signed-declaration.pdf",
        mime: "application/pdf",
      }),
    ];
    // Only the first document's bytes came back from Storage; the second still travels with
    // its assigned name so the cover sheet lists it.
    const zipped = await buildFilingPackageZip(
      context({ attachments: declarations }),
      [],
      [
        { name: "signed_declaration.pdf", bytes: bytes(1) },
        { name: "signed_declaration_1.pdf", bytes: null },
      ],
    );
    const zip = await JSZip.loadAsync(zipped);
    const cover = await zip.file("inventor_declaration.txt")!.async("string");
    expect(cover).toContain("declarations/signed_declaration.pdf");
    expect(cover).toContain("declarations/signed_declaration_1.pdf");
    expect(Object.keys(zip.files)).toContain("declarations/signed_declaration.pdf");
    expect(Object.keys(zip.files)).not.toContain(
      "declarations/signed_declaration_1.pdf",
    );
  });

  it("warns in the cover sheet when no declaration has been uploaded", async () => {
    const zip = await JSZip.loadAsync(await buildFilingPackageZip(context(), [], []));
    const cover = await zip.file("inventor_declaration.txt")!.async("string");
    expect(cover).toContain("NO SIGNED DECLARATION INCLUDED");
  });

  it("carries the matter's data into the ADS and the specification", async () => {
    const zip = await JSZip.loadAsync(await buildFilingPackageZip(context(), [], []));
    const ads = await zip.file("application_data_sheet.txt")!.async("string");
    expect(ads).toContain("Invention title Adjustable mount");
    expect(ads).toContain("Ada Byron");
    const spec = await zip.file("specification.docx")!.async("uint8array");
    // A DOCX is itself a zip, so it starts with the "PK" local file header signature.
    expect([spec[0], spec[1]]).toEqual([0x50, 0x4b]);
  });
});
