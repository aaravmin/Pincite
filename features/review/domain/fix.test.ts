import { describe, expect, it } from "vitest";
import {
  applyReplacement,
  buildFixPrompt,
  markSpan,
  nearestIndex,
  parseFixResponse,
} from "@/features/review/domain/fix";

describe("nearestIndex", () => {
  it("returns -1 when the text is absent", () => {
    expect(nearestIndex("a device", "widget", 0)).toBe(-1);
  });

  it("picks the occurrence closest to the flagged span, not the first", () => {
    const hay = "the widget, a base, the widget again";
    expect(nearestIndex(hay, "widget", 30)).toBe(24);
    expect(nearestIndex(hay, "widget", 0)).toBe(4);
  });

  it("keeps the earlier occurrence on a tie", () => {
    // "x" sits at 0 and 4; a midpoint of 2 is equidistant from both.
    expect(nearestIndex("x__ x", "x", 2)).toBe(0);
  });
});

describe("markSpan", () => {
  it("wraps exactly the flagged span", () => {
    expect(markSpan("a widget b", 2, 8)).toBe("a ⟦widget⟧ b");
  });

  it("clamps offsets that ran past the end of a shortened section", () => {
    expect(markSpan("short", 3, 900)).toBe("sho⟦rt⟧");
    expect(markSpan("short", -5, 2)).toBe("⟦sh⟧ort");
  });

  it("produces an empty marked span when end precedes start", () => {
    expect(markSpan("short", 4, 1)).toBe("shor⟦⟧t");
  });
});

describe("buildFixPrompt", () => {
  it("names the section, the defect, and the CFR reference", () => {
    const { system, prompt } = buildFixPrompt({
      label: "Claims",
      title: "Claim 1 is not a single sentence",
      explanation: "Each claim ends in a period.",
      cfrRef: "37 CFR 1.75",
      marked: "1. A device⟦⟧",
    });
    expect(system).toContain("smallest possible edit");
    expect(prompt).toContain('flagged in the "Claims" section');
    expect(prompt).toContain("Claim 1 is not a single sentence. Each claim ends in a period. (37 CFR 1.75)");
    expect(prompt).toContain("1. A device⟦⟧");
    expect(prompt).toContain("Output JSON only, no commentary.");
  });

  it("omits the parenthetical when there is no CFR reference", () => {
    const { prompt } = buildFixPrompt({
      label: "Abstract",
      title: "Too long",
      explanation: "Trim it.",
      cfrRef: null,
      marked: "text",
    });
    expect(prompt).toContain("Defect: Too long. Trim it.\n");
    expect(prompt).not.toContain("(null)");
  });
});

describe("parseFixResponse", () => {
  it("reads a plain JSON answer", () => {
    expect(
      parseFixResponse('{"before":"a widget","after":"a widget.","note":"Added a period."}'),
    ).toEqual({ before: "a widget", after: "a widget.", note: "Added a period." });
  });

  it("finds the JSON object inside surrounding commentary", () => {
    const parsed = parseFixResponse('Sure!\n{"before":"x","after":"y","note":"n"}\nDone.');
    expect(parsed?.before).toBe("x");
  });

  it("strips span markers the model copied into before", () => {
    expect(parseFixResponse('{"before":"⟦a widget⟧","after":"a widget."}')?.before).toBe(
      "a widget",
    );
  });

  it("caps the note at 200 characters", () => {
    const parsed = parseFixResponse(
      JSON.stringify({ before: "x", after: "y", note: "n".repeat(500) }),
    );
    expect(parsed?.note).toHaveLength(200);
  });

  it("defaults a missing note and after to empty strings", () => {
    expect(parseFixResponse('{"before":"x"}')).toEqual({
      before: "x",
      after: "",
      note: "",
    });
  });

  it("returns null for unparsable output", () => {
    expect(parseFixResponse("I could not do that.")).toBeNull();
    expect(parseFixResponse("{not json at all")).toBeNull();
  });

  it("returns null when before is empty", () => {
    expect(parseFixResponse('{"before":"","after":"y"}')).toBeNull();
    expect(parseFixResponse('{"before":"⟦⟧","after":"y"}')).toBeNull();
  });
});

describe("applyReplacement", () => {
  it("replaces the occurrence nearest the flagged span", () => {
    const content = "the widget, a base, the widget again";
    expect(applyReplacement(content, "widget", "gadget", 30)).toBe(
      "the widget, a base, the gadget again",
    );
  });

  it("returns null when the text moved on since the fix was drafted", () => {
    expect(applyReplacement("a base", "widget", "gadget", 0)).toBeNull();
  });

  it("inserts an empty replacement as a deletion", () => {
    expect(applyReplacement("a big widget", " big", "", 0)).toBe("a widget");
  });
});
