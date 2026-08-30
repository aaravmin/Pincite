import { describe, expect, it } from "vitest";
import {
  ADVANCED_SECTION_KEYS,
  SECTION_KEYS,
  SECTION_TARGET_WORDS,
  filingCompleteness,
  specProgress,
  wordCount,
  type SectionKey,
} from "@/features/projects/domain/sections";

/** Every required (non-advanced) section at or above its substantive-depth target. */
const FULL_SPEC: Partial<Record<SectionKey, number>> = Object.fromEntries(
  SECTION_KEYS.filter((k) => !ADVANCED_SECTION_KEYS.has(k)).map((k) => [
    k,
    SECTION_TARGET_WORDS[k] ?? 10,
  ]),
);

describe("wordCount", () => {
  it("counts nothing in empty or whitespace-only text", () => {
    expect(wordCount("")).toBe(0);
    expect(wordCount("   \n\t  ")).toBe(0);
  });

  it("counts words across any run of whitespace", () => {
    expect(wordCount("one")).toBe(1);
    expect(wordCount("one two  three")).toBe(3);
    expect(wordCount("  one\ntwo\tthree  ")).toBe(3);
  });

  it("counts punctuation-joined tokens as single words", () => {
    expect(wordCount("well-known, state-of-the-art.")).toBe(2);
  });
});

describe("specProgress", () => {
  it("is zero with nothing drafted", () => {
    expect(specProgress({})).toBe(0);
  });

  it("scores each required section out of ten, by depth", () => {
    // Ten required sections, so one finished section is a tenth of the draft.
    expect(specProgress({ title: 3 })).toBeCloseTo(0.1, 10);
    // Half of the background target is half of a tenth.
    expect(specProgress({ background: 20 })).toBeCloseTo(0.05, 10);
  });

  it("caps a section at its target so a long section cannot carry the draft", () => {
    expect(specProgress({ title: 3000 })).toBeCloseTo(0.1, 10);
  });

  it("reaches one when every required section hits its target", () => {
    expect(specProgress(FULL_SPEC)).toBeCloseTo(1, 10);
  });

  it("ignores the advanced sections", () => {
    expect(ADVANCED_SECTION_KEYS.has("office_action")).toBe(true);
    expect(specProgress({ office_action: 5000 })).toBe(0);
    expect(specProgress({ ...FULL_SPEC, office_action: 5000 })).toBeCloseTo(1, 10);
  });

  it("credits a one-word stub only fractionally on a deep section", () => {
    // The detailed description targets 80 words, so one word is 1/800 of the draft.
    expect(specProgress({ detailed_description: 1 })).toBeCloseTo(0.00125, 10);
  });
});

describe("filingCompleteness", () => {
  const complete = {
    sectionWords: FULL_SPEC,
    hasDisclosure: true,
    inventorCount: 1,
    hasSignedDeclaration: true,
  };

  it("is zero with nothing done", () => {
    expect(
      filingCompleteness({
        sectionWords: {},
        hasDisclosure: false,
        inventorCount: 0,
        hasSignedDeclaration: false,
      }),
    ).toBe(0);
  });

  it("is one hundred when the draft and all three prerequisites are done", () => {
    expect(filingCompleteness(complete)).toBe(100);
  });

  it("weights the draft at seventy percent", () => {
    expect(
      filingCompleteness({ ...complete, hasDisclosure: false, inventorCount: 0, hasSignedDeclaration: false }),
    ).toBe(70);
  });

  it("gives each prerequisite ten points", () => {
    const none = { sectionWords: {}, hasDisclosure: false, inventorCount: 0, hasSignedDeclaration: false };
    expect(filingCompleteness({ ...none, hasDisclosure: true })).toBe(10);
    expect(filingCompleteness({ ...none, inventorCount: 1 })).toBe(10);
    expect(filingCompleteness({ ...none, hasSignedDeclaration: true })).toBe(10);
    expect(filingCompleteness({ ...none, hasDisclosure: true, inventorCount: 1, hasSignedDeclaration: true })).toBe(30);
  });

  it("counts any number of inventors as the same ten points", () => {
    const base = { sectionWords: {}, hasDisclosure: false, hasSignedDeclaration: false };
    expect(filingCompleteness({ ...base, inventorCount: 1 })).toBe(
      filingCompleteness({ ...base, inventorCount: 9 }),
    );
  });

  it("rounds a half point up", () => {
    // Title full plus half a Background is 0.15 of the draft: 0.7*0.15 + 0.1 = 20.5.
    expect(
      filingCompleteness({
        sectionWords: { title: 3, background: 20 },
        hasDisclosure: true,
        inventorCount: 0,
        hasSignedDeclaration: false,
      }),
    ).toBe(21);
  });

  it("returns a whole number for a partial draft", () => {
    const score = filingCompleteness({
      sectionWords: { title: 3 },
      hasDisclosure: false,
      inventorCount: 0,
      hasSignedDeclaration: false,
    });
    expect(score).toBe(7);
    expect(Number.isInteger(score)).toBe(true);
  });
});
