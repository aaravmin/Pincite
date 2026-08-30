import { describe, expect, it } from "vitest";
import { runTier2 } from "@/features/review/domain/tier2";
import type { Finding } from "@/features/review/domain/finding";

const titles = (findings: Finding[]) => findings.map((f) => f.title);

describe("runTier2 - guards", () => {
  it("returns nothing for a design application", () => {
    const claims = "1. A widget comprising a means for gripping and the flange.";
    expect(runTier2({ claims }, "design")).toEqual([]);
    // The same text under the utility suite does produce findings.
    expect(runTier2({ claims }).length).toBeGreaterThan(0);
  });

  it("returns nothing when there are no claims", () => {
    expect(runTier2({})).toEqual([]);
    expect(runTier2({ claims: "   \n " })).toEqual([]);
  });

  it("returns nothing for a clean claim", () => {
    expect(runTier2({ claims: "1. A widget comprising a base, wherein the base is round." })).toEqual([]);
  });
});

describe("runTier2 - means plus function (MPEP 2181)", () => {
  it("flags a nonce word followed by a function and spans the phrase", () => {
    const claims = "1. A widget comprising a means for gripping a rail.";
    const [f] = runTier2({ claims });
    expect(f).toMatchObject({
      section_key: "claims",
      severity: "attention",
      kind: "consistency",
      actionable: true,
      title: 'Claim 1 invokes means plus function "means for gripping"',
      mpep_section: "2181",
      cfr_ref: "35 U.S.C. 112(f)",
    });
    expect(claims.slice(f.span_start, f.span_end)).toBe("means for gripping");
  });

  it("flags other nonce words the same way", () => {
    const claims = "1. A widget comprising a module for sensing a load.";
    expect(titles(runTier2({ claims }))).toContain(
      'Claim 1 invokes means plus function "module for sensing"',
    );
  });

  it("reports at most one means plus function finding per claim", () => {
    const claims =
      "1. A widget comprising a means for gripping a rail and a module for sensing a load.";
    expect(runTier2({ claims }).filter((f) => f.mpep_section === "2181")).toHaveLength(1);
  });

  it("does not flag a nonce word that is not followed by a function", () => {
    const claims = "1. A widget comprising a module, wherein the module is round.";
    expect(runTier2({ claims })).toEqual([]);
  });
});

describe("runTier2 - antecedent basis (MPEP 2173.05(e))", () => {
  it("flags a definite reference with no earlier introduction", () => {
    const claims = "1. A widget comprising a base and the flange.";
    const [f] = runTier2({ claims });
    expect(f).toMatchObject({
      section_key: "claims",
      severity: "attention",
      kind: "consistency",
      actionable: true,
      title: 'Claim 1: "the flange" may lack antecedent basis',
      mpep_section: "2173.05(e)",
      cfr_ref: "35 U.S.C. 112(b)",
    });
    expect(claims.slice(f.span_start, f.span_end)).toBe("the flange");
  });

  it('flags "said" the same way as "the"', () => {
    const claims = "1. A widget comprising a base and said flange.";
    expect(titles(runTier2({ claims }))).toContain(
      'Claim 1: "said flange" may lack antecedent basis',
    );
  });

  it('accepts an element introduced with "a" earlier in the same claim', () => {
    expect(runTier2({ claims: "1. A widget comprising a flange, wherein the flange is round." })).toEqual([]);
  });

  it("accepts a multi-word element by every one of its words", () => {
    const claims =
      "1. A widget comprising a molded fiber container, wherein the container is round.";
    expect(runTier2({ claims })).toEqual([]);
  });

  it("inherits the elements of a parent claim through the dependency chain", () => {
    const claims =
      "1. A widget comprising a base.\n2. The widget of claim 1, wherein the base is round.";
    expect(runTier2({ claims })).toEqual([]);
  });

  it("still flags an element a dependent claim never introduced", () => {
    const claims =
      "1. A widget comprising a base.\n2. The widget of claim 1, wherein the flange is round.";
    // The quoted span is the raw two-word match, so a trailing verb rides along.
    const [f] = runTier2({ claims });
    expect(titles(runTier2({ claims }))).toEqual([
      'Claim 2: "the flange is" may lack antecedent basis',
    ]);
    expect(claims.slice(f.span_start, f.span_end)).toBe("the flange is");
  });

  it("accepts a bare prior mention in a parent claim", () => {
    const claims =
      "1. A widget having moisture control.\n2. The widget of claim 1, wherein the moisture is trapped.";
    expect(runTier2({ claims })).toEqual([]);
  });

  it("skips boilerplate heads such as the present invention", () => {
    expect(runTier2({ claims: "1. A widget of the present invention comprising a base." })).toEqual([]);
    expect(runTier2({ claims: "1. A widget comprising a base and the first element." })).toEqual([]);
  });

  it("reports one finding per unintroduced reference", () => {
    const claims = "1. A widget comprising a base, the flange and the strut.";
    expect(titles(runTier2({ claims }))).toEqual([
      'Claim 1: "the flange and" may lack antecedent basis',
      'Claim 1: "the strut" may lack antecedent basis',
    ]);
  });
});
