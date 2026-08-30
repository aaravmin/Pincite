import { describe, expect, it } from "vitest";
import { extractLimitations } from "@/features/prior-art/domain/extract";
import { matchCandidate } from "@/features/prior-art/domain/match";

const CLAIMS =
  "1. A beverage container comprising: an insulated molded body; and a sealing lid coupled to the body.";

describe("matchCandidate", () => {
  it("finds the candidate sentence with the strongest term overlap", () => {
    const limits = extractLimitations(CLAIMS);
    const m = matchCandidate(
      limits,
      "A cardboard box for shipping. The sealing lid is coupled to the body of the container.",
    );
    expect(m.totalLimitations).toBe(2);
    expect(m.limitationsWithOverlap).toBe(2);
    // The unrelated shipping sentence never wins; both limitations land on the one
    // passage that actually shares their terms.
    expect(new Set(m.spans.map((s) => s.patentSpanText))).toEqual(
      new Set(["The sealing lid is coupled to the body of the container."]),
    );
  });

  it("reports the span offsets of the user's own limitation, not the candidate's", () => {
    const limits = extractLimitations(CLAIMS);
    const m = matchCandidate(limits, "A sealing lid coupled to the body.");
    const span = m.spans[0];
    expect(CLAIMS.slice(span.userSpanStart, span.userSpanEnd)).toBe(
      "and a sealing lid coupled to the body.",
    );
  });

  it("calls a near-complete read on the limitation a whole-limitation overlap", () => {
    const limits = extractLimitations("1. A rotating flywheel assembly mounted on a shaft.");
    const m = matchCandidate(limits, "A rotating flywheel assembly mounted on a shaft.");
    expect(m.spans[0].overlapType).toBe("claim_limitation");
    expect(m.spans[0].confidence).toBe(1);
  });

  it("calls a partial overlap lexical", () => {
    const limits = extractLimitations("1. A rotating flywheel assembly mounted on a shaft.");
    const m = matchCandidate(limits, "A rotating flywheel assembly is disclosed here.");
    expect(m.spans[0].overlapType).toBe("lexical");
    expect(m.spans[0].confidence).toBeLessThan(0.8);
  });

  it("records nothing when the overlap is below the strong threshold", () => {
    const limits = extractLimitations(CLAIMS);
    const m = matchCandidate(limits, "A bicycle chain tensioner for a derailleur.");
    expect(m.spans).toEqual([]);
    expect(m.limitationsWithOverlap).toBe(0);
    expect(m.overallScore).toBe(0);
  });

  it("scores as 0.6 x fraction-of-limitations-hit plus 0.4 x average confidence", () => {
    const limits = extractLimitations(CLAIMS);
    const m = matchCandidate(
      limits,
      "The sealing lid is coupled to the body of the container.",
    );
    const fraction = m.limitationsWithOverlap / m.totalLimitations;
    const avg =
      m.spans.reduce((a, s) => a + s.confidence, 0) / (m.spans.length || 1);
    expect(m.overallScore).toBe(Number((0.6 * fraction + 0.4 * avg).toFixed(2)));
  });

  it("returns an empty, zero-scored match for empty inputs", () => {
    expect(matchCandidate([], "anything at all")).toEqual({
      spans: [],
      overallScore: 0,
      limitationsWithOverlap: 0,
      totalLimitations: 0,
    });
    const limits = extractLimitations(CLAIMS);
    expect(matchCandidate(limits, "").spans).toEqual([]);
  });

  it("ignores candidate fragments too short to be a passage", () => {
    const limits = extractLimitations(CLAIMS);
    const m = matchCandidate(limits, "lid body. The sealing lid is coupled to the body.");
    expect(m.spans[0].patentSpanText).toBe("The sealing lid is coupled to the body.");
  });
});
