import { describe, expect, it } from "vitest";
import { runTier3 } from "@/features/review/domain/tier3";
import type { Finding } from "@/features/review/domain/finding";

const titles = (findings: Finding[]) => findings.map((f) => f.title);

describe("runTier3 - guards", () => {
  it("returns nothing for a design application", () => {
    const claims = "1. A widget comprising a substantially flat base.";
    expect(runTier3({ claims }, "design")).toEqual([]);
    expect(runTier3({ claims }).length).toBe(1);
  });

  it("returns nothing when there are no claims", () => {
    expect(runTier3({})).toEqual([]);
    expect(runTier3({ claims: "" })).toEqual([]);
    expect(runTier3({ claims: "  \n\t " })).toEqual([]);
  });

  it("returns nothing for a claim with no relative terms", () => {
    expect(runTier3({ claims: "1. A widget comprising a flat base." })).toEqual([]);
  });
});

describe("runTier3 - relative terms (MPEP 2173.05(b))", () => {
  it("flags a relative term and spans exactly that word", () => {
    const claims = "1. A widget comprising a substantially flat base.";
    const [f] = runTier3({ claims });
    expect(f).toMatchObject({
      section_key: "claims",
      severity: "attention",
      kind: "substantive",
      actionable: true,
      title: 'Claim 1 uses the relative term "substantially"',
      explanation: "Indefinite unless the draft gives a standard to measure it.",
      mpep_section: "2173.05(b)",
      cfr_ref: "35 U.S.C. 112(b)",
    });
    expect(claims.slice(f.span_start, f.span_end)).toBe("substantially");
  });

  it("keeps the term's original casing in the title and the span", () => {
    const claims = "1. A widget comprising Approximately ten ribs.";
    const [f] = runTier3({ claims });
    expect(f.title).toBe('Claim 1 uses the relative term "Approximately"');
    expect(claims.slice(f.span_start, f.span_end)).toBe("Approximately");
  });

  it("reports each distinct term once, in the order the term list defines", () => {
    const claims =
      "1. A widget comprising a substantially flat base positioned approximately centrally.";
    expect(titles(runTier3({ claims }))).toEqual([
      'Claim 1 uses the relative term "substantially"',
      'Claim 1 uses the relative term "approximately"',
    ]);
  });

  it("reports only the first occurrence of a repeated term", () => {
    const claims = "1. A widget comprising a substantially flat and substantially round base.";
    const found = runTier3({ claims });
    expect(found).toHaveLength(1);
    expect(claims.slice(found[0].span_start, found[0].span_end)).toBe("substantially");
    expect(found[0].span_start).toBe(claims.indexOf("substantially"));
  });

  it("matches a multi-word term across any run of whitespace", () => {
    const claims = "1. A method comprising adding an effective  amount of a reagent.";
    const [f] = runTier3({ claims });
    expect(f.title).toBe('Claim 1 uses the relative term "effective  amount"');
    expect(claims.slice(f.span_start, f.span_end)).toBe("effective  amount");
  });

  it("does not match a relative term inside a longer word", () => {
    expect(runTier3({ claims: "1. A widget comprising an aboutface plate." })).toEqual([]);
  });

  it("offsets each finding into its own claim", () => {
    const claims =
      "1. A widget comprising a flat base.\n2. The widget of claim 1, wherein the base is generally round.";
    const [f] = runTier3({ claims });
    expect(f.title).toBe('Claim 2 uses the relative term "generally"');
    expect(claims.slice(f.span_start, f.span_end)).toBe("generally");
  });

  it("flags every relative term in the list", () => {
    const terms = [
      "substantially",
      "approximately",
      "about",
      "essentially",
      "relatively",
      "generally",
      "sufficient",
      "effective amount",
    ];
    for (const term of terms) {
      const claims = `1. A widget comprising ${term} one base.`;
      expect(titles(runTier3({ claims }))).toContain(
        `Claim 1 uses the relative term "${term}"`,
      );
    }
  });
});
