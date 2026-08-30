import { describe, expect, it } from "vitest";
import {
  applyResolvedPins,
  collectPins,
} from "@/features/mpep/domain/citations";

describe("collectPins", () => {
  it("returns the distinct non-null pins", () => {
    expect(
      collectPins([
        { mpep_section: "2173" },
        { mpep_section: null },
        { mpep_section: "2173" },
        { mpep_section: "608.01(m)" },
      ]),
    ).toEqual(["2173", "608.01(m)"]);
  });

  it("returns nothing when no item carries a pin", () => {
    expect(collectPins([{ mpep_section: null }, { mpep_section: null }])).toEqual([]);
  });
});

describe("applyResolvedPins", () => {
  it("nulls out a pin that does not resolve to corpus text", () => {
    const items = [
      { mpep_section: "2173", note: "definite" },
      { mpep_section: "9999", note: "hallucinated" },
    ];
    expect(applyResolvedPins(items, new Set(["2173"]))).toEqual([
      { mpep_section: "2173", note: "definite" },
      { mpep_section: null, note: "hallucinated" },
    ]);
  });

  it("keeps every other field and the item identity when the pin resolves", () => {
    const item = { mpep_section: "2181", severity: "violation" as const };
    const out = applyResolvedPins([item], new Set(["2181"]));
    expect(out[0]).toBe(item);
  });

  it("leaves an item with no pin untouched", () => {
    const item = { mpep_section: null, cfr_ref: "37 CFR 1.75" };
    expect(applyResolvedPins([item], new Set())[0]).toBe(item);
  });

  it("drops every pin when nothing resolved", () => {
    const out = applyResolvedPins(
      [{ mpep_section: "101" }, { mpep_section: "103" }],
      new Set(),
    );
    expect(out.map((i) => i.mpep_section)).toEqual([null, null]);
  });

  it("returns an empty list unchanged", () => {
    expect(applyResolvedPins([], new Set(["2173"]))).toEqual([]);
  });
});
