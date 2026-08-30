import { describe, expect, it } from "vitest";
import { parseClaims } from "@/features/review/domain/claims";
import {
  buildEligibilityPrompt,
  parseEligibilityResponse,
  pickIndependentClaim,
} from "@/features/review/domain/eligibility";

describe("pickIndependentClaim", () => {
  it("takes the first claim that does not reference another claim", () => {
    const claims = parseClaims(
      "1. A method comprising steps.\n2. The method of claim 1, wherein it is fast.",
    );
    expect(pickIndependentClaim(claims)?.number).toBe(1);
  });

  it("skips a leading dependent claim", () => {
    const claims = parseClaims(
      "1. The widget of claim 2, wherein it is small.\n2. A widget comprising a base.",
    );
    expect(pickIndependentClaim(claims)?.number).toBe(2);
  });

  it("falls back to the first claim when every claim is dependent", () => {
    const claims = parseClaims(
      "1. The widget of claim 3.\n2. The widget of claim 1.",
    );
    expect(pickIndependentClaim(claims)?.number).toBe(1);
  });

  it("returns undefined when there are no claims", () => {
    expect(pickIndependentClaim([])).toBeUndefined();
  });
});

describe("buildEligibilityPrompt", () => {
  it("walks the framework and never asks for a verdict", () => {
    const { system, prompt } = buildEligibilityPrompt({
      number: 1,
      raw: "A method comprising steps.",
    });
    expect(system).toContain("MPEP 2106");
    expect(system).toContain("Do NOT decide whether the claim is eligible or ineligible");
    expect(prompt).toContain("Claim 1: A method comprising steps.");
    expect(prompt).toContain("- category: Step 1");
    expect(prompt).toContain("(not a verdict)");
  });
});

describe("parseEligibilityResponse", () => {
  it("reads the five framework keys", () => {
    const analysis = parseEligibilityResponse(
      JSON.stringify({
        category: "process",
        prong_one: "recites an abstract idea",
        prong_two: "integrated",
        step_2b: "adds more",
        summary: "sits at 2A prong two",
      }),
    );
    expect(analysis).toEqual({
      category: "process",
      prong_one: "recites an abstract idea",
      prong_two: "integrated",
      step_2b: "adds more",
      summary: "sits at 2A prong two",
    });
  });

  it("defaults missing framework keys to empty strings", () => {
    const analysis = parseEligibilityResponse('{"category":"machine"}');
    expect(analysis.prong_one).toBe("");
    expect(analysis.prong_two).toBe("");
    expect(analysis.step_2b).toBe("");
  });

  it("falls back to the raw answer for a missing summary", () => {
    const analysis = parseEligibilityResponse('prose before {"category":"machine"}');
    expect(analysis.summary).toBe('prose before {"category":"machine"}');
  });

  it("throws on malformed JSON so the caller can report a model error", () => {
    expect(() => parseEligibilityResponse("{ nope: }")).toThrow();
  });
});
