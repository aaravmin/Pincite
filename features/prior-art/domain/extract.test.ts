import { describe, expect, it } from "vitest";
import {
  claimKeywords,
  extractLimitations,
  significantTerms,
  stemmedTerms,
} from "@/features/prior-art/domain/extract";

describe("significantTerms", () => {
  it("drops claim boilerplate and function words", () => {
    expect(significantTerms("a container comprising the plurality of lids")).toEqual([
      "container",
      "lids",
    ]);
  });

  it("lowercases and keeps hyphenated technical terms", () => {
    expect(significantTerms("A Heat-Resistant Liner")).toEqual(["heat-resistant", "liner"]);
  });

  it("ignores tokens shorter than three characters and bare numbers", () => {
    expect(significantTerms("an ax 12 rotor")).toEqual(["rotor"]);
  });

  it("keeps repeats, so callers can count frequency", () => {
    expect(significantTerms("container and container")).toEqual(["container", "container"]);
  });
});

describe("stemmedTerms", () => {
  it("collapses trivial inflection so overlap survives it", () => {
    expect(stemmedTerms("supporting supports supported support")).toEqual([
      "support",
      "support",
      "support",
      "support",
    ]);
    expect(stemmedTerms("containers container")).toEqual(["container", "container"]);
    expect(stemmedTerms("rotates rotate rotating")).toEqual(["rotat", "rotat", "rotat"]);
  });

  it("turns a -ies plural back into -y", () => {
    expect(stemmedTerms("assemblies")).toEqual(["assembly"]);
  });

  it("leaves a short stem alone rather than eroding it", () => {
    expect(stemmedTerms("gas")).toEqual(["gas"]);
  });
});

describe("claimKeywords", () => {
  it("returns the most frequent significant terms, most frequent first", () => {
    const text = "A container. The container holds a liquid. The liquid is hot.";
    expect(claimKeywords(text, 2)).toEqual(["container", "liquid"]);
  });

  it("honors the limit", () => {
    const text = "container liquid handle lid base spout";
    expect(claimKeywords(text, 3)).toHaveLength(3);
  });

  it("returns nothing for empty claims", () => {
    expect(claimKeywords("")).toEqual([]);
  });
});

describe("extractLimitations", () => {
  const claims = [
    "1. A container comprising: a molded body; and a lid attached to the body.",
    "2. The container of claim 1, wherein the lid includes a vent opening.",
  ].join("\n");

  it("splits each claim into its semicolon-delimited clauses", () => {
    const limits = extractLimitations(claims);
    expect(limits.map((l) => l.claimNumber)).toEqual([1, 1, 2]);
    // parseClaims strips the "1. " label, so the first clause starts at the preamble.
    expect(limits[0].text).toBe("A container comprising: a molded body");
    expect(limits[1].text).toBe("and a lid attached to the body.");
    expect(limits[2].text).toBe(
      "The container of claim 1, wherein the lid includes a vent opening.",
    );
  });

  it("reports offsets that land on the clause inside the claims text", () => {
    for (const l of extractLimitations(claims)) {
      expect(claims.slice(l.start, l.end)).toBe(l.text);
    }
  });

  it("skips a clause with fewer than two significant terms", () => {
    const thin = "1. A device comprising: a; and a base plate for support.";
    const texts = extractLimitations(thin).map((l) => l.text);
    expect(texts).not.toContain("a");
    expect(texts).toContain("and a base plate for support.");
  });

  it("returns nothing for empty claims", () => {
    expect(extractLimitations("")).toEqual([]);
  });
});
