import { describe, it, expect } from "vitest";
import {
  assembleDrawingReview,
  type AssembleInput,
  type VisionRead,
} from "@/features/drawings/domain/review-assembly";

const vision = (p: Partial<VisionRead> = {}): VisionRead => ({
  summary: "",
  figureLabel: "FIG. 1",
  numerals: [],
  issues: [],
  ...p,
});

const input = (p: Partial<AssembleInput> = {}): AssembleInput => ({
  vision: vision(),
  disclosureComponents: "",
  specText: "",
  generalMpep: "608.02",
  numeralMpep: "608.01(g)",
  resolvedPins: new Set(["608.02", "608.01(g)"]),
  ...p,
});

describe("assembleDrawingReview - vision issues", () => {
  it("carries every model issue through with its location and 37 CFR 1.84", () => {
    const review = assembleDrawingReview(
      input({
        vision: vision({
          summary: "A latch.",
          issues: [
            { title: "Lead line with no numeral", detail: "At the hinge.", x: 0.2, y: 0.3 },
            { title: "", detail: "Background is not white.", x: null, y: null },
          ],
        }),
      }),
    );
    expect(review.findings).toEqual([
      {
        id: "issue-0",
        title: "Lead line with no numeral",
        detail: "At the hinge.",
        cfr: "37 CFR 1.84",
        mpep: "608.02",
        x: 0.2,
        y: 0.3,
      },
      {
        id: "issue-1",
        title: "Drawing issue",
        detail: "Background is not white.",
        cfr: "37 CFR 1.84",
        mpep: "608.02",
        x: null,
        y: null,
      },
    ]);
    expect(review.summary).toBe("A latch.");
    expect(review.figureLabel).toBe("FIG. 1");
  });
});

describe("assembleDrawingReview - figure label", () => {
  it("flags a missing figure label under 37 CFR 1.84(u)", () => {
    const review = assembleDrawingReview(
      input({ vision: vision({ figureLabel: null }) }),
    );
    expect(review.findings).toHaveLength(1);
    expect(review.findings[0]).toMatchObject({
      id: "figlabel",
      title: "No figure label detected",
      cfr: "37 CFR 1.84(u)",
      mpep: "608.02",
      x: null,
      y: null,
    });
    expect(review.findings[0].detail).toBe(
      "No label such as FIG. 1 was found. Each view must be numbered (37 CFR 1.84(u)).",
    );
  });

  it("does not flag when a label was read", () => {
    const review = assembleDrawingReview(input());
    expect(review.findings).toHaveLength(0);
  });
});

describe("assembleDrawingReview - reference numerals", () => {
  it("flags only the numerals that are absent from the draft", () => {
    const review = assembleDrawingReview(
      input({
        vision: vision({
          numerals: [
            { numeral: "10", x: 0.1, y: 0.1 },
            { numeral: "16", x: 0.5, y: 0.5 },
          ],
        }),
        specText: "The container 10 comprises a lid 12.",
      }),
    );
    expect(review.findings.map((f) => f.id)).toEqual(["numeral-0"]);
    expect(review.findings[0]).toEqual({
      id: "numeral-0",
      title: "Reference numeral 16 not described",
      detail:
        "Numeral 16 appears in the drawing but is not mentioned in your draft (37 CFR 1.84(p)).",
      cfr: "37 CFR 1.84(p)",
      mpep: "608.01(g)",
      x: 0.5,
      y: 0.5,
    });
  });

  it("dedupes a numeral repeated across the figure, keeping the first location", () => {
    const review = assembleDrawingReview(
      input({
        vision: vision({
          numerals: [
            { numeral: "16", x: 0.1, y: 0.2 },
            { numeral: "16", x: 0.8, y: 0.9 },
            { numeral: "16a", x: 0.3, y: 0.3 },
          ],
        }),
      }),
    );
    expect(review.findings.map((f) => f.title)).toEqual([
      "Reference numeral 16 not described",
      "Reference numeral 16a not described",
    ]);
    expect(review.findings[0]).toMatchObject({ id: "numeral-0", x: 0.1, y: 0.2 });
    expect(review.findings[1]).toMatchObject({ id: "numeral-1" });
  });

  it("dedupes case-insensitively", () => {
    const review = assembleDrawingReview(
      input({
        vision: vision({
          numerals: [
            { numeral: "12A", x: 0, y: 0 },
            { numeral: "12a", x: 1, y: 1 },
          ],
        }),
      }),
    );
    expect(review.findings).toHaveLength(1);
  });

  it("does not match a numeral that is only part of a longer number", () => {
    const review = assembleDrawingReview(
      input({
        vision: vision({ numerals: [{ numeral: "1", x: 0, y: 0 }] }),
        specText: "The hinge 12 and the base 124.",
      }),
    );
    expect(review.findings).toHaveLength(1);
  });

  it("matches regardless of case and around punctuation", () => {
    const review = assembleDrawingReview(
      input({
        vision: vision({ numerals: [{ numeral: "12A", x: 0, y: 0 }] }),
        specText: "See the lid (12a), which seals.",
      }),
    );
    expect(review.findings).toHaveLength(0);
  });

  it("treats a numeral with regex characters literally", () => {
    const review = assembleDrawingReview(
      input({
        vision: vision({ numerals: [{ numeral: "1.5", x: 0, y: 0 }] }),
        specText: "The ratio 1.5 is described.",
      }),
    );
    expect(review.findings).toHaveLength(0);
  });

  it("numbers numeral findings independently of the issue findings", () => {
    const review = assembleDrawingReview(
      input({
        vision: vision({
          figureLabel: null,
          issues: [{ title: "Too light", detail: "", x: null, y: null }],
          numerals: [
            { numeral: "8", x: 0, y: 0 },
            { numeral: "9", x: 0, y: 0 },
          ],
        }),
      }),
    );
    expect(review.findings.map((f) => f.id)).toEqual([
      "issue-0",
      "figlabel",
      "numeral-0",
      "numeral-1",
    ]);
  });
});

describe("assembleDrawingReview - component presence", () => {
  it("splits components on newlines, commas and semicolons", () => {
    const review = assembleDrawingReview(
      input({
        disclosureComponents: "lid\nbase, hinge; vent",
        vision: vision({ summary: "A lid over a base with a hinge." }),
      }),
    );
    expect(review.components).toEqual([
      { name: "lid", shown: true },
      { name: "base", shown: true },
      { name: "hinge", shown: true },
      { name: "vent", shown: false },
    ]);
  });

  it("strips a leading article before probing the summary", () => {
    const review = assembleDrawingReview(
      input({
        disclosureComponents: "the flux capacitor\nan outer rim",
        vision: vision({ summary: "A drawing showing a capacitor and an outer rim." }),
      }),
    );
    expect(review.components).toEqual([
      { name: "the flux capacitor", shown: true },
      { name: "an outer rim", shown: true },
    ]);
  });

  it("keeps the component name as typed, including the article", () => {
    const review = assembleDrawingReview(
      input({ disclosureComponents: "  The Lid  ", vision: vision({ summary: "A lid." }) }),
    );
    expect(review.components).toEqual([{ name: "The Lid", shown: true }]);
  });

  it("drops entries shorter than three characters", () => {
    const review = assembleDrawingReview(
      input({ disclosureComponents: "ab\nlid" }),
    );
    expect(review.components.map((c) => c.name)).toEqual(["lid"]);
  });

  it("does not claim a component is shown when the probe word is too short", () => {
    const review = assembleDrawingReview(
      input({
        disclosureComponents: "the ab",
        vision: vision({ summary: "ab ab ab" }),
      }),
    );
    expect(review.components).toEqual([{ name: "the ab", shown: false }]);
  });

  it("matches on the whole term when the last word alone does not appear", () => {
    const review = assembleDrawingReview(
      input({
        disclosureComponents: "moisture channeling feature",
        vision: vision({ summary: "It has a moisture channeling feature." }),
      }),
    );
    expect(review.components).toEqual([
      { name: "moisture channeling feature", shown: true },
    ]);
  });

  it("returns no components for empty disclosure text", () => {
    expect(assembleDrawingReview(input()).components).toEqual([]);
  });
});

describe("assembleDrawingReview - pins", () => {
  it("drops an MPEP pin that did not resolve, keeping the finding", () => {
    const review = assembleDrawingReview(
      input({
        vision: vision({
          figureLabel: null,
          numerals: [{ numeral: "16", x: 0, y: 0 }],
        }),
        resolvedPins: new Set(),
      }),
    );
    expect(review.findings.map((f) => f.mpep)).toEqual([null, null]);
    expect(review.findings).toHaveLength(2);
  });

  it("uses the design MPEP section when the caller supplies it", () => {
    const review = assembleDrawingReview(
      input({
        vision: vision({ figureLabel: null }),
        generalMpep: "1503.02",
        resolvedPins: new Set(["1503.02"]),
      }),
    );
    expect(review.findings[0].mpep).toBe("1503.02");
  });
});
