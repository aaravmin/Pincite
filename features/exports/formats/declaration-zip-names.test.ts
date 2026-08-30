import { describe, expect, it } from "vitest";
import { declarationZipNames } from "@/features/exports/formats/filing-package";

describe("declarationZipNames", () => {
  it("keeps a plain filename, folding the sanitized punctuation to underscores", () => {
    expect(declarationZipNames(["signed-declaration.pdf"])).toEqual([
      "signed_declaration.pdf",
    ]);
    expect(declarationZipNames(["ada_byron.pdf"])).toEqual(["ada_byron.pdf"]);
  });

  it("replaces characters that are unsafe inside a zip path", () => {
    expect(declarationZipNames(["../../etc/passwd.pdf"])).toEqual([
      ".._.._etc_passwd.pdf",
    ]);
    expect(declarationZipNames(["Ada Byron signed.pdf"])).toEqual([
      "Ada_Byron_signed.pdf",
    ]);
  });

  it("de-duplicates a repeated name by suffixing before the extension", () => {
    expect(
      declarationZipNames([
        "signed-declaration.pdf",
        "signed-declaration.pdf",
        "signed-declaration.pdf",
      ]),
    ).toEqual([
      "signed_declaration.pdf",
      "signed_declaration_1.pdf",
      "signed_declaration_2.pdf",
    ]);
  });

  it("treats a collision case-insensitively, since zip readers often do", () => {
    expect(declarationZipNames(["Decl.PDF", "decl.pdf"])).toEqual([
      "Decl.PDF",
      "decl_1.pdf",
    ]);
  });

  it("suffixes at the end when the name has no extension", () => {
    expect(declarationZipNames(["declaration", "declaration"])).toEqual([
      "declaration",
      "declaration_1",
    ]);
  });

  it("falls back to a positional name for an empty or fully stripped filename", () => {
    expect(declarationZipNames(["", "   ", ":::"])).toEqual([
      "declaration_1.pdf",
      "declaration_2.pdf",
      "declaration_3.pdf",
    ]);
  });

  it("truncates a very long filename to 80 characters", () => {
    const [name] = declarationZipNames([`${"a".repeat(200)}.pdf`]);
    expect(name).toHaveLength(80);
    expect(name).toBe("a".repeat(80));
  });

  it("returns one name per input, in order", () => {
    const names = declarationZipNames(["b.pdf", "a.pdf", "b.pdf"]);
    expect(names).toHaveLength(3);
    expect(new Set(names.map((n) => n.toLowerCase())).size).toBe(3);
    expect(names[0]).toBe("b.pdf");
    expect(names[1]).toBe("a.pdf");
  });
});
