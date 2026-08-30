import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { buildSpecDocx } from "@/lib/export/docx";

/** The visible text of the generated document, in order. */
async function documentText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file("word/document.xml")!.async("string");
  return xml
    .replace(/<w:p[ >]/g, "\n<w:p ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

const SECTIONS = {
  title: "Adjustable mount for a display arm",
  background: "Existing mounts sag.\nThey also rattle.",
  summary: "A mount that does not sag.",
  detailed_description: "The base 10 supports the arm 12.",
  claims: "1. A mount comprising a base.",
  abstract: "A mount for a display arm,\nwith a base.",
};

describe("buildSpecDocx", () => {
  it("returns a DOCX package", async () => {
    const buffer = await buildSpecDocx(SECTIONS);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    // A zip container always starts with the "PK" local file header signature.
    expect(buffer.subarray(0, 2).toString("latin1")).toBe("PK");
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("emits the 37 CFR 1.77 headings in order", async () => {
    const text = await documentText(await buildSpecDocx(SECTIONS));
    const headings = [
      "TITLE OF THE INVENTION",
      // The sanitizer drops the hyphen from "CROSS-REFERENCE" before it is written.
      "CROSS REFERENCE TO RELATED APPLICATIONS",
      "STATEMENT REGARDING FEDERALLY SPONSORED RESEARCH OR DEVELOPMENT",
      "BACKGROUND OF THE INVENTION",
      "BRIEF SUMMARY OF THE INVENTION",
      "BRIEF DESCRIPTION OF THE DRAWINGS",
      "DETAILED DESCRIPTION OF THE INVENTION",
      "CLAIMS",
      "ABSTRACT OF THE DISCLOSURE",
    ];
    const positions = headings.map((h) => text.indexOf(h));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('writes "Not Applicable." for an empty section rather than dropping it', async () => {
    const text = await documentText(await buildSpecDocx(SECTIONS));
    expect(text).toContain("Not Applicable.");
  });

  it("numbers the description paragraphs continuously from 0001", async () => {
    const text = await documentText(await buildSpecDocx(SECTIONS));
    expect(text).toContain("[0001] Existing mounts sag.");
    expect(text).toContain("[0002] They also rattle.");
    expect(text).toContain("[0003] A mount that does not sag.");
    // The empty drawings section still consumes no paragraph number.
    expect(text).toContain("[0004] The base 10 supports the arm 12.");
  });

  it("does not number the claims or the abstract", async () => {
    const text = await documentText(await buildSpecDocx(SECTIONS));
    expect(text).toContain("1. A mount comprising a base.");
    expect(text).not.toContain("[0005]");
  });

  it("joins the abstract onto a single line", async () => {
    const text = await documentText(await buildSpecDocx(SECTIONS));
    expect(text).toContain("A mount for a display arm, with a base.");
  });

  it("sanitizes the banned punctuation out of the body text", async () => {
    const text = await documentText(
      await buildSpecDocx({ ...SECTIONS, summary: "A mount: self-locking." }),
    );
    expect(text).toContain("A mount self locking.");
  });

  it("still produces a document when every section is empty", async () => {
    const buffer = await buildSpecDocx({});
    expect(buffer.subarray(0, 2).toString("latin1")).toBe("PK");
    const text = await documentText(buffer);
    expect(text).toContain("TITLE OF THE INVENTION");
    expect(text).toContain("Not Applicable.");
    expect(text).not.toContain("[0001]");
  });
});
