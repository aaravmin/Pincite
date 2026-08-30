import { describe, expect, it } from "vitest";
import { runCrossRefChecks } from "@/features/review/domain/cross-reference";
import { emptyDisclosure, type Disclosure } from "@/lib/disclosure/types";

const disclosure = (over: Partial<Disclosure> = {}): Disclosure => ({
  ...emptyDisclosure(),
  ...over,
});
const titles = (findings: { title: string }[]) => findings.map((f) => f.title);

const SPEC = {
  claims: "1. A widget comprising a base.",
  detailed_description: "The base supports a lid and a hinge.",
  summary: "A widget with a lid.",
  background: "Existing widgets lack a hinge.",
};

describe("runCrossRefChecks - disclosed components", () => {
  it("returns nothing when every component is described", () => {
    expect(runCrossRefChecks(disclosure({ components: "base\nlid\nhinge" }), SPEC)).toEqual([]);
  });

  it("flags a component that never reaches the claims or the description", () => {
    const [f] = runCrossRefChecks(disclosure({ components: "flywheel" }), SPEC);
    expect(f).toEqual({
      severity: "attention",
      actionable: true,
      title: 'Component "flywheel" from your disclosure is not claimed or described',
      explanation:
        "Add it to the detailed description, and to the claims if it's part of the invention.",
      mpep_section: "2163",
      cfr_ref: "35 U.S.C. 112(a)",
    });
  });

  it("splits components on newlines, commas and semicolons", () => {
    const found = runCrossRefChecks(
      disclosure({ components: "flywheel, gearbox; camshaft\ndriveshaft" }),
      SPEC,
    );
    expect(titles(found)).toEqual([
      'Component "flywheel" from your disclosure is not claimed or described',
      'Component "gearbox" from your disclosure is not claimed or described',
      'Component "camshaft" from your disclosure is not claimed or described',
      'Component "driveshaft" from your disclosure is not claimed or described',
    ]);
  });

  it("ignores component fragments shorter than three characters", () => {
    expect(runCrossRefChecks(disclosure({ components: "ab" }), SPEC)).toEqual([]);
  });

  it("probes on the last word that is not a generic stopword", () => {
    // "unit" is generic, so "control unit" is looked up by "control".
    expect(
      runCrossRefChecks(disclosure({ components: "control unit" }), {
        ...SPEC,
        detailed_description: "The control circuit drives the base.",
      }),
    ).toEqual([]);
    expect(
      titles(
        runCrossRefChecks(disclosure({ components: "control unit" }), {
          ...SPEC,
          detailed_description: "The unit drives the base.",
        }),
      ),
    ).toEqual(['Component "control unit" from your disclosure is not claimed or described']);
  });

  it("strips a leading article before probing", () => {
    expect(
      runCrossRefChecks(disclosure({ components: "a flywheel" }), {
        ...SPEC,
        detailed_description: "The flywheel stores energy.",
      }),
    ).toEqual([]);
  });

  it("falls back to the whole term when every word is a stopword", () => {
    expect(
      runCrossRefChecks(disclosure({ components: "the system" }), {
        ...SPEC,
        detailed_description: "The system holds a base.",
      }),
    ).toEqual([]);
  });

  it("skips a component whose probe word is shorter than three characters", () => {
    expect(runCrossRefChecks(disclosure({ components: "a b cd" }), SPEC)).toEqual([]);
  });

  it("reports at most eight missing components", () => {
    const components = [
      "quokka", "wombat", "gibbon", "marmot", "lemurs",
      "iguana", "possum", "badger", "beaver", "otterx",
    ].join("\n");
    const found = runCrossRefChecks(disclosure({ components }), SPEC);
    expect(found).toHaveLength(8);
    expect(found[0].title).toContain('"quokka"');
    expect(found[7].title).toContain('"badger"');
  });

  it("flags every component when the specification is still empty", () => {
    // The joined spec text is "\n\n" rather than "", so the guard passes and each
    // disclosed component reads as not yet described.
    const found = runCrossRefChecks(disclosure({ components: "flywheel\ngearbox" }), {});
    expect(titles(found)).toEqual([
      'Component "flywheel" from your disclosure is not claimed or described',
      'Component "gearbox" from your disclosure is not claimed or described',
    ]);
  });

  it("reads only the claims, detailed description and summary", () => {
    // A component that appears only in the Background still counts as missing.
    const found = runCrossRefChecks(disclosure({ components: "flywheel" }), {
      ...SPEC,
      background: "Prior flywheel designs are heavy.",
    });
    expect(titles(found)).toEqual([
      'Component "flywheel" from your disclosure is not claimed or described',
    ]);
  });
});

describe("runCrossRefChecks - problem statement", () => {
  it("flags a stated problem when the Background is empty", () => {
    const found = runCrossRefChecks(
      disclosure({ problem_solved: "Widgets tip over." }),
      { ...SPEC, background: "   " },
    );
    expect(found).toEqual([
      {
        severity: "attention",
        actionable: true,
        title: "Your problem statement is not reflected in the Background",
        explanation: "Carry it into the Background, which is empty.",
        mpep_section: "608.01(c)",
        cfr_ref: "37 CFR 1.77(b)",
      },
    ]);
  });

  it("stays quiet when the Background has any content", () => {
    expect(
      runCrossRefChecks(disclosure({ problem_solved: "Widgets tip over." }), SPEC),
    ).toEqual([]);
  });

  it("stays quiet when no problem was stated", () => {
    expect(runCrossRefChecks(disclosure({ problem_solved: "  " }), { ...SPEC, background: "" })).toEqual([]);
  });

  it("returns nothing at all for an empty disclosure", () => {
    expect(runCrossRefChecks(emptyDisclosure(), SPEC)).toEqual([]);
  });
});
