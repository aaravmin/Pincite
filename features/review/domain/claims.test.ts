import { describe, expect, it } from "vitest";
import { parseClaims } from "@/features/review/domain/claims";

describe("parseClaims", () => {
  it("returns nothing for empty or whitespace-only content", () => {
    expect(parseClaims("")).toEqual([]);
    expect(parseClaims("   \n\t  ")).toEqual([]);
  });

  it('splits on "N." markers and reports the body offset, not the number', () => {
    const text = "1. A widget comprising a base.\n2. The widget of claim 1, wherein the base is round.";
    const claims = parseClaims(text);
    expect(claims.map((c) => c.number)).toEqual([1, 2]);
    expect(claims[0].raw).toBe("A widget comprising a base.");
    expect(claims[1].raw).toBe("The widget of claim 1, wherein the base is round.");
    // `start` is the offset of the claim marker; the raw body begins after "N. ".
    expect(claims[0].start).toBe(0);
    expect(claims[1].start).toBe(text.indexOf("2."));
    expect(text.indexOf(claims[1].raw, claims[1].start)).toBe(text.indexOf("The widget"));
  });

  it('splits on "N)" markers too', () => {
    const claims = parseClaims("12) A frame comprising a rail.\n13) The frame of claim 12.");
    expect(claims.map((c) => c.number)).toEqual([12, 13]);
    expect(claims[0].raw).toBe("A frame comprising a rail.");
  });

  it("keeps the numbers as written rather than renumbering", () => {
    const claims = parseClaims("1. A widget comprising a base.\n5. A frame comprising a rail.");
    expect(claims.map((c) => c.number)).toEqual([1, 5]);
  });

  it("absorbs a blank line between claims into the following claim's start", () => {
    const text = "1. A widget comprising a base.\n\n2. A frame comprising a rail.";
    const claims = parseClaims(text);
    expect(claims).toHaveLength(2);
    // The leading whitespace run belongs to the second marker, so start is one before "2.".
    expect(claims[1].start).toBe(text.indexOf("2.") - 1);
    expect(claims[0].raw).toBe("A widget comprising a base.");
    expect(claims[1].raw).toBe("A frame comprising a rail.");
  });

  it("keeps a multi-line claim body together", () => {
    const claims = parseClaims("1. A widget comprising:\n   a base; and\n   a lid.\n2. The widget of claim 1.");
    expect(claims).toHaveLength(2);
    expect(claims[0].raw).toBe("A widget comprising:\n   a base; and\n   a lid.");
  });

  it("treats unnumbered content as a single claim 1 starting at offset 0", () => {
    const text = "  A widget comprising a base.  ";
    const claims = parseClaims(text);
    expect(claims).toHaveLength(1);
    expect(claims[0].number).toBe(1);
    expect(claims[0].start).toBe(0);
    expect(claims[0].raw).toBe("A widget comprising a base.");
  });

  it("does not treat a number without trailing space as a claim marker", () => {
    const claims = parseClaims("1.A widget comprising a base.");
    expect(claims).toHaveLength(1);
    expect(claims[0].raw).toBe("1.A widget comprising a base.");
  });

  it("splits preamble, transition and body at the earliest transitional phrase", () => {
    const [c] = parseClaims("1. A widget comprising a base and a lid.");
    expect(c.preamble).toBe("A widget");
    expect(c.transition).toBe("comprising");
    expect(c.body).toBe("a base and a lid.");
  });

  it("prefers the longer transition when both would match the same words", () => {
    const [c] = parseClaims("1. A widget consisting essentially of a base.");
    expect(c.transition).toBe("consisting essentially of");
    expect(c.preamble).toBe("A widget");
    expect(c.body).toBe("a base.");
  });

  it("keeps the transition's original casing", () => {
    const [c] = parseClaims("1. A widget Comprising a base.");
    expect(c.transition).toBe("Comprising");
  });

  it("picks the earliest transition when several appear", () => {
    const [c] = parseClaims("1. A widget having a base, the base comprising a rim.");
    expect(c.transition).toBe("having");
    expect(c.body).toBe("a base, the base comprising a rim.");
  });

  it('recognizes "wherein" as a transition for a dependent claim', () => {
    const [c] = parseClaims("1. The widget of claim 1, wherein the base is round.");
    expect(c.transition).toBe("wherein");
    expect(c.preamble).toBe("The widget of claim 1,");
  });

  it("reports no transition and an empty body when none is recognized", () => {
    const [c] = parseClaims("1. A widget with a base.");
    expect(c.transition).toBeNull();
    expect(c.preamble).toBe("A widget with a base.");
    expect(c.body).toBe("");
  });
});
