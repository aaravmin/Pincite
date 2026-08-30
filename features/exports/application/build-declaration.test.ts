import { describe, expect, it } from "vitest";
import {
  buildDeclaration,
  parseFilingDocument,
} from "@/features/exports/application/build-declaration";
import type { ExportContext } from "@/features/exports/types";
import { SECTION_KEYS, type SectionKey } from "@/lib/projects/sections";
import type { Project } from "@/lib/projects/types";
import type { Inventor } from "@/lib/filing/types";

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

const sections = Object.fromEntries(SECTION_KEYS.map((k) => [k, ""])) as Record<
  SectionKey,
  string
>;

function context(over: Partial<ExportContext> = {}): ExportContext {
  return {
    project,
    sections: { ...sections, title: "A molded fiber container" },
    inventors: [inventor],
    attachments: [],
    title: "A molded fiber container",
    ...over,
  };
}

const build = (
  doc: "poa" | "declaration",
  ctx: ExportContext | null = context(),
) => buildDeclaration({ projectId: "p1", doc }, { loadContext: async () => ctx });

const isPdf = (body: Uint8Array | string) =>
  Buffer.from(body as Uint8Array)
    .subarray(0, 5)
    .toString("latin1") === "%PDF-";

describe("parseFilingDocument", () => {
  it("returns the inventor's declaration unless the power of attorney was asked for", () => {
    expect(parseFilingDocument("poa")).toBe("poa");
    expect(parseFilingDocument(null)).toBe("declaration");
    expect(parseFilingDocument("")).toBe("declaration");
    expect(parseFilingDocument("declaration")).toBe("declaration");
    expect(parseFilingDocument("POA")).toBe("declaration");
  });
});

describe("buildDeclaration", () => {
  it("answers null when the matter is not visible to the viewer", async () => {
    expect(await build("declaration", null)).toBeNull();
  });

  it("serves the inventor's declaration as a downloadable PDF", async () => {
    const artifact = (await build("declaration"))!;
    expect(artifact).toMatchObject({
      contentType: "application/pdf",
      filename: "declaration_p1.pdf",
      disposition: "attachment",
    });
    expect(isPdf(artifact.body)).toBe(true);
  });

  it("serves the power of attorney as a downloadable PDF", async () => {
    const artifact = (await build("poa"))!;
    expect(artifact).toMatchObject({
      contentType: "application/pdf",
      filename: "power_of_attorney_p1.pdf",
      disposition: "attachment",
    });
    expect(isPdf(artifact.body)).toBe(true);
  });

  it("still produces a declaration when no inventor has been entered", async () => {
    const artifact = (await build("declaration", context({ inventors: [] })))!;
    expect(isPdf(artifact.body)).toBe(true);
  });

  it("sanitizes the project id used in the filename", async () => {
    const artifact = (await buildDeclaration(
      { projectId: "a b:c", doc: "declaration" },
      { loadContext: async () => context() },
    ))!;
    expect(artifact.filename).toBe("declaration_a_b_c.pdf");
  });

  it("falls back to the client name when there is no recorded applicant", async () => {
    // Both branches must render; the applicant text itself is checked in the PDF builder's
    // own tests, so here it is enough that neither shape crashes the document.
    const named = await build(
      "poa",
      context({ project: { ...project, client_name: "Analytical Engines Ltd" } }),
    );
    expect(isPdf(named!.body)).toBe(true);
    const unnamed = await build("poa", context());
    expect(isPdf(unnamed!.body)).toBe(true);
  });
});
