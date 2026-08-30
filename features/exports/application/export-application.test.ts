import { describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
import {
  exportApplication,
  type ExportApplicationDeps,
} from "@/features/exports/application/export-application";
import type { Report } from "@/features/exports/formats/txt";
import {
  EXPORT_FORMATS,
  type ExportContext,
  type ExportFormat,
} from "@/features/exports/types";
import { SECTION_KEYS, type SectionKey } from "@/features/projects/domain/sections";
import type { Project } from "@/features/projects/domain/types";
import type { Inventor } from "@/features/filing/domain/types";
import type { Attachment } from "@/features/drawings/domain/types";

/** A real 1x1 PNG, so the figure pipeline runs for real rather than being stubbed. */
const PNG = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
);

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

const DRAWING = attachment({ id: "a1" });
const SCAN = attachment({ id: "a2", mime: "image/tiff", filename: "a2.tiff" });
const DECLARATION = attachment({
  id: "d1",
  kind: "declaration",
  filename: "signed-declaration.pdf",
  mime: "application/pdf",
});

const sections = Object.fromEntries(SECTION_KEYS.map((k) => [k, ""])) as Record<
  SectionKey,
  string
>;

const context: ExportContext = {
  project,
  sections: { ...sections, title: "A molded fiber container" },
  inventors: [inventor],
  attachments: [DRAWING, SCAN, DECLARATION],
  title: "A molded fiber container",
};

const report: Report = {
  project,
  stage: "Claims drafting",
  generatedAt: "2026-08-29T12:00:00.000Z",
  sections: [],
  findings: [],
  appliesNow: [],
  conditional: [],
  priorArt: [],
};

function fakes(over: Partial<ExportApplicationDeps> = {}) {
  const recorded: { projectId: string; format: ExportFormat }[] = [];
  const readAttachments = vi.fn(async (paths: string[]) => {
    const bytes = new Map<string, Uint8Array>();
    for (const p of paths) bytes.set(p, PNG);
    return bytes;
  });
  const deps: ExportApplicationDeps = {
    loadContext: vi.fn(async () => context),
    loadReport: vi.fn(async () => report),
    readAttachments,
    record: async (projectId, format) => {
      recorded.push({ projectId, format });
    },
    ...over,
  };
  return { deps, recorded, readAttachments };
}

const run = (
  format: ExportFormat,
  deps: ExportApplicationDeps,
  preview = false,
) => exportApplication({ projectId: "p1", format, preview }, deps);

describe("exportApplication - artifacts", () => {
  it("serves the review TXT", async () => {
    const { deps } = fakes();
    const artifact = await run("txt", deps);
    expect(artifact).toMatchObject({
      contentType: "text/plain; charset=utf-8",
      filename: "pincite_p1.txt",
      disposition: "attachment",
    });
    expect(String(artifact!.body)).toContain("PINCITE REVIEW");
  });

  it("serves the typeset patent PDF", async () => {
    const { deps } = fakes();
    const artifact = await run("pdf", deps);
    expect(artifact).toMatchObject({
      contentType: "application/pdf",
      filename: "patent_p1.pdf",
      disposition: "attachment",
    });
    expect(Buffer.from(artifact!.body as Uint8Array).subarray(0, 5).toString()).toBe(
      "%PDF-",
    );
  });

  it("serves the specification DOCX", async () => {
    const { deps } = fakes();
    const artifact = await run("docx", deps);
    expect(artifact).toMatchObject({
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      filename: "specification_p1.docx",
      disposition: "attachment",
    });
  });

  it("serves the LaTeX bundle as a zip", async () => {
    const { deps } = fakes();
    const artifact = await run("latex", deps);
    expect(artifact).toMatchObject({
      contentType: "application/zip",
      filename: "pincite_patent_latex_p1.zip",
      disposition: "attachment",
    });
    const names = Object.keys(
      (await JSZip.loadAsync(artifact!.body as Uint8Array)).files,
    );
    expect(names).toContain("patent.tex");
    expect(names).toContain("figures/figure_01.pdf");
  });

  it("serves the filing package as a zip, declarations and all", async () => {
    const { deps } = fakes();
    const artifact = await run("package", deps);
    expect(artifact).toMatchObject({
      contentType: "application/zip",
      filename: "pincite_filing_p1.zip",
      disposition: "attachment",
    });
    const names = Object.keys(
      (await JSZip.loadAsync(artifact!.body as Uint8Array)).files,
    );
    expect(names).toContain("specification.docx");
    expect(names).toContain("declarations/signed_declaration.pdf");
    expect(names).toContain("drawings/figure_01.png");
  });

  it("streams the preview inline as the same patent PDF, without a download name change", async () => {
    const { deps } = fakes();
    const artifact = await run("latex", deps, true);
    expect(artifact).toMatchObject({
      contentType: "application/pdf",
      filename: "patent_p1.pdf",
      disposition: "inline",
    });
  });

  it("sanitizes the project id used in the filename", async () => {
    const { deps } = fakes();
    const artifact = await exportApplication(
      { projectId: "a b:c", format: "txt", preview: false },
      deps,
    );
    expect(artifact!.filename).toBe("pincite_a_b_c.txt");
  });
});

describe("exportApplication - recording", () => {
  it("records exactly one export per download, naming the format", async () => {
    for (const format of EXPORT_FORMATS) {
      const { deps, recorded } = fakes();
      await run(format, deps);
      expect(recorded).toEqual([{ projectId: "p1", format }]);
    }
  });

  it("never records a preview", async () => {
    for (const format of EXPORT_FORMATS) {
      const { deps, recorded } = fakes();
      await run(format, deps, true);
      expect(recorded).toEqual([]);
    }
  });

  it("does not record when the matter is not visible", async () => {
    for (const format of EXPORT_FORMATS) {
      const { deps, recorded } = fakes({
        loadContext: async () => null,
        loadReport: async () => null,
      });
      expect(await run(format, deps)).toBeNull();
      expect(recorded).toEqual([]);
    }
  });

  it("returns null for a preview of a matter that is not visible", async () => {
    const { deps } = fakes({ loadContext: async () => null });
    expect(await run("pdf", deps, true)).toBeNull();
  });
});

describe("exportApplication - attachment reads", () => {
  it("reads every needed file in one call", async () => {
    const { deps, readAttachments } = fakes();
    await run("package", deps);
    expect(readAttachments).toHaveBeenCalledTimes(1);
    expect(readAttachments.mock.calls[0][0]).toEqual([
      DRAWING.storage_path,
      SCAN.storage_path,
      DECLARATION.storage_path,
    ]);
  });

  it("reads only the typesettable drawings for the PDF and the LaTeX bundle", async () => {
    for (const format of ["pdf", "latex"] as const) {
      const { deps, readAttachments } = fakes();
      await run(format, deps);
      expect(readAttachments).toHaveBeenCalledTimes(1);
      expect(readAttachments.mock.calls[0][0]).toEqual([DRAWING.storage_path]);
    }
  });

  it("reads nothing for the formats that have no figures", async () => {
    for (const format of ["txt", "docx"] as const) {
      const { deps, readAttachments } = fakes();
      await run(format, deps);
      expect(readAttachments).not.toHaveBeenCalled();
    }
  });

  it("skips a file Storage could not return instead of failing the export", async () => {
    const { deps } = fakes({ readAttachments: async () => new Map() });
    const artifact = await run("package", deps);
    const names = Object.keys(
      (await JSZip.loadAsync(artifact!.body as Uint8Array)).files,
    );
    expect(names).toContain("specification.docx");
    expect(names.some((n) => n.startsWith("drawings/"))).toBe(false);
    expect(names.some((n) => n.startsWith("declarations/"))).toBe(false);
  });
});

describe("exportApplication - unsupported format", () => {
  it("answers null without loading anything", async () => {
    const { deps, recorded } = fakes();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Only reachable by bypassing the controller's parseExportFormat validation.
    const artifact = await run("odt" as ExportFormat, deps);
    spy.mockRestore();
    expect(artifact).toBeNull();
    expect(deps.loadContext).not.toHaveBeenCalled();
    expect(deps.loadReport).not.toHaveBeenCalled();
    expect(recorded).toEqual([]);
  });
});
