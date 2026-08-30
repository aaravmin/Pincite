import { describe, expect, it } from "vitest";
import { runTier1 } from "@/features/review/domain/tier1";
import type { Finding } from "@/features/review/domain/finding";

const titled = (findings: Finding[], needle: string) =>
  findings.filter((f) => f.title.includes(needle));
const titles = (findings: Finding[]) => findings.map((f) => f.title);

describe("runTier1 - title", () => {
  it("passes a title at exactly the 500 character limit", () => {
    expect(runTier1({ title: "t".repeat(500) })).toEqual([]);
  });

  it("flags a title over 500 characters and spans the whole title", () => {
    const title = "t".repeat(501);
    const [f, ...rest] = runTier1({ title });
    expect(rest).toEqual([]);
    expect(f).toMatchObject({
      section_key: "title",
      span_start: 0,
      span_end: 501,
      severity: "violation",
      kind: "structural",
      actionable: true,
      title: "Title is 501 characters (limit 500)",
      mpep_section: "606",
      cfr_ref: "37 CFR 1.72(a)",
    });
  });
});

describe("runTier1 - abstract", () => {
  it("ignores an empty abstract", () => {
    expect(runTier1({ abstract: "   " })).toEqual([]);
  });

  it("passes an abstract at exactly 150 words", () => {
    expect(runTier1({ abstract: Array(150).fill("word").join(" ") })).toEqual([]);
  });

  it("flags an abstract over 150 words with the counted length", () => {
    const abstract = Array(151).fill("word").join(" ");
    const [f] = runTier1({ abstract });
    expect(f).toMatchObject({
      section_key: "abstract",
      span_start: 0,
      span_end: abstract.length,
      severity: "violation",
      actionable: true,
      title: "Abstract is 151 words (limit 150)",
      mpep_section: "608.01(b)",
      cfr_ref: "37 CFR 1.72(b)",
    });
  });

  it('spans exactly the word "means" in the abstract', () => {
    const abstract = "A device means for gripping.";
    const [f] = runTier1({ abstract });
    expect(f).toMatchObject({
      section_key: "abstract",
      severity: "attention",
      title: 'Abstract uses "means"',
    });
    expect(abstract.slice(f.span_start, f.span_end)).toBe("means");
  });

  it("flags a multi-paragraph abstract", () => {
    const abstract = "First paragraph.\n\nSecond paragraph.";
    const [f] = runTier1({ abstract });
    expect(f).toMatchObject({
      severity: "attention",
      actionable: true,
      title: "Abstract is more than one paragraph",
      mpep_section: "608.01(b)",
    });
    expect(f.span_end).toBe(abstract.length);
  });

  it("skips every abstract check for a design application", () => {
    const abstract = "A device means for gripping.\n\n" + Array(200).fill("word").join(" ");
    expect(runTier1({ abstract }, "design")).toEqual([]);
  });
});

describe("runTier1 - utility claim structure", () => {
  it("returns nothing for a clean two-claim set", () => {
    const claims =
      "1. A widget comprising a base.\n2. The widget of claim 1, wherein the base is round.";
    expect(runTier1({ claims })).toEqual([]);
  });

  it("ignores an empty claims section", () => {
    expect(runTier1({ claims: "  \n " })).toEqual([]);
  });

  it("spans the claim body, not its number", () => {
    const claims = "1. A widget comprising a base\n2. A frame comprising a rail.";
    const [f] = titled(runTier1({ claims }), "Claim 1 is not a single sentence");
    expect(claims.slice(f.span_start, f.span_end)).toBe("A widget comprising a base");
    expect(f).toMatchObject({
      severity: "violation",
      kind: "structural",
      actionable: true,
      mpep_section: "608.01(m)",
      cfr_ref: "37 CFR 1.75",
    });
  });

  it("flags a claim that runs to a second sentence", () => {
    const claims = "1. A widget comprising a base. It is round.";
    expect(titles(runTier1({ claims }))).toContain("Claim 1 is not a single sentence");
  });

  it("flags a missing transitional phrase", () => {
    const claims = "1. A widget with a base.";
    const [f] = titled(runTier1({ claims }), "no recognized transitional phrase");
    expect(f).toMatchObject({
      severity: "attention",
      actionable: true,
      title: "Claim 1 has no recognized transitional phrase",
      mpep_section: "2111.03",
      cfr_ref: null,
    });
  });

  it("flags claims that are not numbered consecutively from 1", () => {
    const claims = "1. A widget comprising a base.\n3. A frame comprising a rail.";
    const [f] = titled(runTier1({ claims }), "not numbered consecutively");
    expect(f).toMatchObject({
      span_start: 0,
      span_end: 40,
      severity: "violation",
      mpep_section: "608.01(m)",
      cfr_ref: "37 CFR 1.126",
    });
  });

  it("caps the numbering span at the length of a short claims section", () => {
    const claims = "2. A widget comprising a base.";
    const [f] = titled(runTier1({ claims }), "not numbered consecutively");
    expect(f.span_end).toBe(claims.length);
  });

  it("flags a reference to a claim that does not exist", () => {
    const claims =
      "1. A widget comprising a base.\n2. The widget of claim 5, wherein the base is round.";
    const [f] = titled(runTier1({ claims }), "does not exist");
    expect(f).toMatchObject({
      severity: "violation",
      title: "Claim 2 refers to claim 5, which does not exist",
      mpep_section: "608.01(n)",
      cfr_ref: "37 CFR 1.75(c)",
    });
    expect(claims.slice(f.span_start, f.span_end)).toBe(
      "The widget of claim 5, wherein the base is round.",
    );
  });

  it("flags a forward reference to a later claim", () => {
    const claims =
      "1. A widget comprising a base.\n2. The widget of claim 3, wherein it is round.\n3. The widget of claim 1, wherein it is red.";
    const [f] = titled(runTier1({ claims }), "does not precede it");
    expect(f).toMatchObject({
      severity: "violation",
      title: "Claim 2 refers to claim 3, which does not precede it",
      cfr_ref: "37 CFR 1.75(c)",
    });
  });

  it("flags a claim that refers to itself", () => {
    const claims = "1. A widget comprising a base.\n2. The widget of claim 2, wherein it is round.";
    expect(titles(runTier1({ claims }))).toContain(
      "Claim 2 refers to claim 2, which does not precede it",
    );
  });

  it("flags a dependent claim 1", () => {
    const claims =
      "1. The widget of claim 2, wherein it is round.\n2. A widget comprising a base.";
    const [f] = titled(runTier1({ claims }), "Claim 1 is a dependent claim");
    expect(f).toMatchObject({
      severity: "attention",
      actionable: true,
      mpep_section: "608.01(m)",
      cfr_ref: "37 CFR 1.75(g)",
    });
  });

  it("does not flag claim 1 as dependent when it is independent", () => {
    const claims = "1. A widget comprising a base.\n2. The widget of claim 1, wherein it is round.";
    expect(titled(runTier1({ claims }), "Claim 1 is a dependent claim")).toEqual([]);
  });
});

describe("runTier1 - multiple dependent claims", () => {
  const base = "1. A widget comprising a base.\n2. The widget of claim 1, wherein it is round.\n";

  it('flags the fee and the "and" form when claims are joined conjunctively', () => {
    const claims = base + "3. The widget of claims 1 and 2, wherein it is red.";
    const found = runTier1({ claims });
    const [fee] = titled(found, "(fee applies)");
    expect(fee).toMatchObject({
      severity: "attention",
      actionable: false,
      title: "Claim 3 is a multiple dependent claim (fee applies)",
      mpep_section: "608.01(n)",
      cfr_ref: "37 CFR 1.16(j)",
    });
    const [alt] = titled(found, "must be in the alternative");
    expect(alt).toMatchObject({
      severity: "violation",
      actionable: true,
      title: "Claim 3 multiple dependent claim must be in the alternative",
      cfr_ref: "37 CFR 1.75(c)",
    });
  });

  it('accepts the alternative "or" form and only charges the fee', () => {
    const claims = base + "3. The widget of claims 1 or 2, wherein it is red.";
    const found = runTier1({ claims });
    expect(titled(found, "(fee applies)")).toHaveLength(1);
    expect(titled(found, "must be in the alternative")).toEqual([]);
  });

  it('treats "any one of claims" as the alternative form', () => {
    const claims = base + "3. The widget of any one of claims 1 to 2, wherein it is red.";
    const found = runTier1({ claims });
    expect(titled(found, "(fee applies)")).toHaveLength(1);
    expect(titled(found, "must be in the alternative")).toEqual([]);
  });

  it("flags a multiple dependent claim that depends on another one", () => {
    const claims =
      base +
      "3. The widget of claims 1 or 2, wherein it is red.\n" +
      "4. The widget of claims 2 or 3, wherein it is heavy.";
    const [f] = titled(runTier1({ claims }), "depends on another multiple dependent claim");
    expect(f).toMatchObject({
      severity: "violation",
      actionable: true,
      title: "Claim 4 depends on another multiple dependent claim",
      mpep_section: "608.01(n)",
      cfr_ref: "37 CFR 1.75(c)",
    });
  });
});

describe("runTier1 - claim count fees", () => {
  const independent = (n: number) => `${n}. A widget comprising a base ${n}.`;
  const dependent = (n: number) => `${n}. The widget of claim 1, wherein it is round ${n}.`;

  it("charges no excess fee at exactly 20 claims and 3 independent claims", () => {
    const claims = [
      independent(1),
      independent(2),
      independent(3),
      ...Array.from({ length: 17 }, (_, i) => dependent(i + 4)),
    ].join("\n");
    const found = runTier1({ claims });
    expect(titled(found, "fee applies")).toEqual([]);
  });

  it("charges the excess-claim fee above 20 total claims", () => {
    const claims = [
      independent(1),
      ...Array.from({ length: 20 }, (_, i) => dependent(i + 2)),
    ].join("\n");
    const [f] = titled(runTier1({ claims }), "total claims");
    expect(f).toMatchObject({
      severity: "attention",
      actionable: false,
      title: "21 total claims (over 20; fee applies)",
      span_start: 0,
      span_end: 40,
      cfr_ref: "37 CFR 1.16(i)",
    });
  });

  it("charges the excess fee above 3 independent claims", () => {
    const claims = [1, 2, 3, 4].map(independent).join("\n");
    const [f] = titled(runTier1({ claims }), "independent claims");
    expect(f).toMatchObject({
      severity: "attention",
      actionable: false,
      title: "4 independent claims (over 3; fee applies)",
      cfr_ref: "37 CFR 1.16(h)",
    });
  });
});

describe("runTier1 - design applications", () => {
  const good = "The ornamental design for a beverage container as shown.";

  it("accepts the prescribed single claim naming the titled article", () => {
    expect(
      runTier1({ title: "Beverage container", claims: good }, "design"),
    ).toEqual([]);
  });

  it('accepts the "as shown and described" wording', () => {
    const claims = "The ornamental design for a beverage container as shown and described.";
    expect(runTier1({ title: "Beverage container", claims }, "design")).toEqual([]);
  });

  it("flags more than one claim", () => {
    const claims = `1. ${good}\n2. ${good}`;
    const [f] = titled(runTier1({ title: "Beverage container", claims }, "design"), "exactly one claim");
    expect(f).toMatchObject({
      severity: "violation",
      actionable: true,
      title: "A design application must have exactly one claim (found 2)",
      mpep_section: "1503.03",
      cfr_ref: "37 CFR 1.153",
    });
  });

  it("flags a claim that is not in the required form", () => {
    const claims = "The ornamental design of a beverage container.";
    const found = runTier1({ title: "Beverage container", claims }, "design");
    const [f] = titled(found, "not in the required form");
    expect(f).toMatchObject({
      severity: "violation",
      mpep_section: "1503.03",
      cfr_ref: "37 CFR 1.153",
    });
    expect(claims.slice(f.span_start, f.span_end)).toBe(claims);
  });

  it("flags an article that does not match the title", () => {
    const claims = "The ornamental design for a lamp as shown.";
    const [f] = titled(runTier1({ title: "Chair", claims }, "design"), "does not match the title");
    expect(f).toMatchObject({
      severity: "attention",
      kind: "consistency",
      actionable: true,
      title: "Design claim article does not match the title",
    });
  });

  it("does not compare the article when the title is empty", () => {
    expect(runTier1({ title: "", claims: good }, "design")).toEqual([]);
  });

  it("skips the utility claim suite entirely", () => {
    // No closing period, no transitional phrase, and a reference to a claim that does not
    // exist - every one of those is a utility-only rule and must not fire here.
    const claims = "The ornamental design for a lamp as shown, as set out in claim 9";
    expect(runTier1({ title: "Lamp", claims }, "design")).toEqual([]);
    // The same text under the utility suite does produce those findings.
    expect(titles(runTier1({ title: "Lamp", claims }))).toEqual([
      "Claim 1 is not a single sentence",
      "Claim 1 has no recognized transitional phrase",
      "Claim 1 is a dependent claim",
      "Claim 1 refers to claim 9, which does not exist",
    ]);
  });

  it("still enforces the title limit for a design application", () => {
    const found = runTier1({ title: "t".repeat(501), claims: good }, "design");
    expect(titles(found)).toContain("Title is 501 characters (limit 500)");
  });
});

describe("runTier1 - plant applications", () => {
  it("runs the utility claim suite for a plant application", () => {
    const claims = "1. A plant with a base";
    expect(titles(runTier1({ claims }, "plant"))).toContain(
      "Claim 1 is not a single sentence",
    );
  });
});
