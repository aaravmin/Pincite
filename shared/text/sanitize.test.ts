import { describe, expect, it } from "vitest";
import {
  sanitizeOutputFilename,
  sanitizeOutputRecord,
  sanitizeOutputText,
} from "@/shared/text/sanitize";

describe("sanitizeOutputText", () => {
  it("leaves clean prose untouched", () => {
    expect(sanitizeOutputText("A widget comprising a base.")).toBe(
      "A widget comprising a base.",
    );
    expect(sanitizeOutputText("")).toBe("");
  });

  it("replaces every banned dash with a space", () => {
    // Hyphen-minus, the U+2010..U+2015 dash run, and the U+2212 minus sign.
    for (const dash of ["-", "‐", "‑", "‒", "–", "—", "―", "−"]) {
      expect(sanitizeOutputText(`a${dash}b`)).toBe("a b");
    }
  });

  it("replaces a colon and a semicolon with a space", () => {
    expect(sanitizeOutputText("Note: this")).toBe("Note this");
    expect(sanitizeOutputText("a; b")).toBe("a b");
  });

  it("splits a hyphenated word into two words", () => {
    expect(sanitizeOutputText("well-known")).toBe("well known");
  });

  it("collapses the runs of spaces a replacement leaves behind", () => {
    expect(sanitizeOutputText("a - b")).toBe("a b");
    expect(sanitizeOutputText("a --- b")).toBe("a b");
    expect(sanitizeOutputText("a    b")).toBe("a b");
  });

  it("removes whitespace left in front of sentence punctuation", () => {
    expect(sanitizeOutputText("a ,b")).toBe("a,b");
    expect(sanitizeOutputText("done : .")).toBe("done.");
    expect(sanitizeOutputText("really ?")).toBe("really?");
    expect(sanitizeOutputText("stop !")).toBe("stop!");
  });

  it("keeps newlines and tabs, which are not banned characters", () => {
    expect(sanitizeOutputText("a\nb")).toBe("a\nb");
    expect(sanitizeOutputText("a\tb")).toBe("a\tb");
  });

  it("keeps characters outside the banned set", () => {
    expect(sanitizeOutputText("35 U.S.C. 112(b) · MPEP 2173.05(e)_x/y")).toBe(
      "35 U.S.C. 112(b) · MPEP 2173.05(e)_x/y",
    );
  });

  it("is idempotent", () => {
    const once = sanitizeOutputText("Type: utility - design; plant");
    expect(sanitizeOutputText(once)).toBe(once);
    expect(once).toBe("Type utility design plant");
  });
});

describe("sanitizeOutputFilename", () => {
  it("joins the sanitized words with single underscores", () => {
    expect(sanitizeOutputFilename("My Report: v1")).toBe("My_Report_v1");
    expect(sanitizeOutputFilename("widget-mount draft")).toBe("widget_mount_draft");
  });

  it("collapses repeated underscores", () => {
    expect(sanitizeOutputFilename("a__b")).toBe("a_b");
    expect(sanitizeOutputFilename("a _ b")).toBe("a_b");
  });

  it("trims leading and trailing underscores", () => {
    expect(sanitizeOutputFilename("  spaced  ")).toBe("spaced");
    expect(sanitizeOutputFilename(" - x - ")).toBe("x");
    expect(sanitizeOutputFilename("_a_")).toBe("a");
  });

  it("returns an empty string when nothing survives", () => {
    expect(sanitizeOutputFilename("   ")).toBe("");
    expect(sanitizeOutputFilename("---")).toBe("");
  });

  it("turns a newline into an underscore too", () => {
    expect(sanitizeOutputFilename("a\nb")).toBe("a_b");
  });
});

describe("sanitizeOutputRecord", () => {
  it("sanitizes every value and keeps every key", () => {
    expect(sanitizeOutputRecord({ title: "Widget - mount", note: "See: MPEP 606" })).toEqual({
      title: "Widget mount",
      note: "See MPEP 606",
    });
  });

  it("handles an empty record", () => {
    expect(sanitizeOutputRecord({})).toEqual({});
  });
});
