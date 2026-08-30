import { describe, expect, it } from "vitest";
import {
  EXPORT_FORMATS,
  exportFilename,
  parseExportFormat,
  type ExportFormat,
} from "@/features/exports/types";

describe("parseExportFormat", () => {
  it("defaults to the review TXT when the parameter is absent", () => {
    expect(parseExportFormat(null)).toBe("txt");
  });

  it("accepts every served format", () => {
    for (const f of EXPORT_FORMATS) expect(parseExportFormat(f)).toBe(f);
    expect(EXPORT_FORMATS).toEqual(["txt", "pdf", "docx", "latex", "package"]);
  });

  it("rejects an unknown format rather than defaulting", () => {
    expect(parseExportFormat("zip")).toBeNull();
    expect(parseExportFormat("doc")).toBeNull();
    expect(parseExportFormat("TXT")).toBeNull();
  });

  it("rejects an empty parameter (?format= with no value)", () => {
    expect(parseExportFormat("")).toBeNull();
  });
});

describe("exportFilename", () => {
  it("reproduces the download name of each format", () => {
    const id = "abc_123";
    expect(exportFilename("txt", id)).toBe("pincite_abc_123.txt");
    expect(exportFilename("pdf", id)).toBe("patent_abc_123.pdf");
    expect(exportFilename("docx", id)).toBe("specification_abc_123.docx");
    expect(exportFilename("latex", id)).toBe("pincite_patent_latex_abc_123.zip");
    expect(exportFilename("package", id)).toBe("pincite_filing_abc_123.zip");
  });

  it("names a file for every format, with no collisions", () => {
    const names = EXPORT_FORMATS.map((f: ExportFormat) => exportFilename(f, "x"));
    expect(names.every((n) => n.length > 0)).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });
});
