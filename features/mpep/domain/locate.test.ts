import { describe, expect, it } from "vitest";
import { extractSectionNumbers } from "@/features/mpep/domain/locate";

describe("extractSectionNumbers", () => {
  it("pulls a plain section number out of a question", () => {
    expect(extractSectionNumbers("What does MPEP 2111.03 say?")).toEqual(["2111.03"]);
  });

  it("drops the parenthetical subsection, keeping the section it belongs to", () => {
    expect(extractSectionNumbers("see 2173.05(b) and 608.01(m)")).toEqual([
      "2173.05",
      "608.01",
    ]);
  });

  it("deduplicates repeated references", () => {
    expect(extractSectionNumbers("2173 and again 2173")).toEqual(["2173"]);
  });

  it("ignores numbers outside the MPEP chapter range", () => {
    expect(extractSectionNumbers("chapter 99 or 3000 or 3001")).toEqual([]);
    expect(extractSectionNumbers("year 3025")).toEqual([]);
  });

  // Deliberately loose: a bare statute number is inside the chapter range, so it is
  // offered as a candidate. The corpus lookup is what decides whether it is real - an
  // extracted number that resolves to no section is simply dropped downstream.
  it("also picks up a statute number that falls inside the range", () => {
    expect(extractSectionNumbers("35 U.S.C. 112 in 1836")).toEqual(["112", "1836"]);
  });

  it("accepts the ends of the chapter range", () => {
    expect(extractSectionNumbers("100 and 2999")).toEqual(["100", "2999"]);
  });

  it("finds nothing in a question with no numbers", () => {
    expect(extractSectionNumbers("How definite must a claim be?")).toEqual([]);
  });
});
