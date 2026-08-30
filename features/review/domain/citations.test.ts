import { describe, expect, it } from "vitest";
import {
  collectFindingPins,
  dropUnresolvedPins,
  partitionCitations,
} from "@/features/review/domain/citations";
import type { Finding } from "@/features/review/domain/finding";

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    section_key: "claims",
    span_start: 0,
    span_end: 1,
    severity: "violation",
    kind: "structural",
    actionable: true,
    title: "t",
    explanation: "e",
    mpep_section: null,
    cfr_ref: null,
    ...overrides,
  };
}

describe("partitionCitations", () => {
  it("splits requested citations by whether the corpus has them", () => {
    const { resolved, dropped } = partitionCitations(
      ["608.01(b)", "9999", "2173.05(e)"],
      new Set(["608.01(b)", "2173.05(e)"]),
    );
    expect(resolved).toEqual(["608.01(b)", "2173.05(e)"]);
    expect(dropped).toEqual(["9999"]);
  });

  it("collapses duplicates so a repeated pin is counted once", () => {
    const { resolved, dropped } = partitionCitations(
      ["2106", "2106", "0000", "0000"],
      new Set(["2106"]),
    );
    expect(resolved).toEqual(["2106"]);
    expect(dropped).toEqual(["0000"]);
  });

  it("returns empty buckets for no request", () => {
    expect(partitionCitations([], new Set(["2106"]))).toEqual({
      resolved: [],
      dropped: [],
    });
  });

  it("drops everything when nothing resolves", () => {
    const { resolved, dropped } = partitionCitations(["1", "2"], new Set());
    expect(resolved).toEqual([]);
    expect(dropped).toEqual(["1", "2"]);
  });
});

describe("dropUnresolvedPins", () => {
  it("nulls a pin that is not in the corpus and counts it", () => {
    const result = dropUnresolvedPins(
      [
        finding({ mpep_section: "608.01(b)" }),
        finding({ mpep_section: "made-up" }),
      ],
      new Set(["608.01(b)"]),
    );
    expect(result.findings[0].mpep_section).toBe("608.01(b)");
    expect(result.findings[1].mpep_section).toBeNull();
    expect(result.dropped).toBe(1);
  });

  it("counts each finding that loses a pin, not each distinct section", () => {
    const result = dropUnresolvedPins(
      [finding({ mpep_section: "nope" }), finding({ mpep_section: "nope" })],
      new Set(),
    );
    expect(result.dropped).toBe(2);
  });

  it("leaves the rest of the finding intact and never mutates the input", () => {
    const input = [finding({ mpep_section: "nope", cfr_ref: "35 U.S.C. 112(b)" })];
    const result = dropUnresolvedPins(input, new Set());
    expect(input[0].mpep_section).toBe("nope");
    expect(result.findings[0].cfr_ref).toBe("35 U.S.C. 112(b)");
    expect(result.findings[0].title).toBe("t");
  });

  it("ignores findings that carry no pin", () => {
    const result = dropUnresolvedPins([finding()], new Set());
    expect(result.dropped).toBe(0);
    expect(result.findings[0].mpep_section).toBeNull();
  });
});

describe("collectFindingPins", () => {
  it("keeps only the real pins", () => {
    expect(
      collectFindingPins([
        finding({ mpep_section: "2106" }),
        finding({ mpep_section: null }),
        finding({ mpep_section: "608.01(b)" }),
      ]),
    ).toEqual(["2106", "608.01(b)"]);
  });
});
