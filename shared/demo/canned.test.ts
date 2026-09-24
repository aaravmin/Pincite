import { describe, expect, it } from "vitest";
import { assembleDrawingReview } from "@/features/drawings/domain/review-assembly";
import { SECTION_LABELS } from "@/features/projects/domain/sections";
import { parseClaims } from "@/features/review/domain/claims";
import {
  buildEligibilityPrompt,
  parseEligibilityResponse,
  pickIndependentClaim,
} from "@/features/review/domain/eligibility";
import {
  applyReplacement,
  buildFixPrompt,
  markSpan,
  parseFixResponse,
} from "@/features/review/domain/fix";
import { runDeterministicValidators } from "@/features/review/domain/run-validators";
import { demoDrawingView, demoDrawingVision, demoGenerateText } from "@/shared/demo/canned";
import eligibilityClaim1 from "@/shared/demo/canned/eligibility-claim1.json";
import fixes from "@/shared/demo/canned/fixes.json";
import visionFig01 from "@/shared/demo/canned/vision-fig01.json";
import {
  CASE_STUDY_CLAIMS,
  CASE_STUDY_DISCLOSURE,
  CASE_STUDY_SECTIONS,
} from "@/shared/demo/fixture/case-study";
import { sanitizeOutputText } from "@/shared/text/sanitize";

// The findings the demo review shows, and the fix prompt the app builds for one of them.
const FINDINGS = runDeterministicValidators(CASE_STUDY_SECTIONS, "utility");
const TITLES = FINDINGS.map((f) => f.title);

function fixPrompt(title: string) {
  const finding = FINDINGS.find((f) => f.title === title);
  if (!finding) throw new Error(`The case study raises no finding titled ${title}`);
  const { system, prompt } = buildFixPrompt({
    label: SECTION_LABELS.claims,
    title: finding.title,
    explanation: finding.explanation,
    cfrRef: finding.cfr_ref,
    marked: markSpan(CASE_STUDY_CLAIMS, finding.span_start, finding.span_end),
  });
  return { finding, system, prompt };
}

function stringValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(stringValues);
  if (value && typeof value === "object") return Object.values(value).flatMap(stringValues);
  return [];
}

describe("demo auto fix", () => {
  it.each(fixes)("$title: the canned edit parses and clears only its finding", (fix) => {
    expect(CASE_STUDY_CLAIMS).toContain(fix.before);
    const { finding, system, prompt } = fixPrompt(fix.title);
    expect(parseFixResponse(demoGenerateText(system, prompt))).toEqual({
      before: fix.before,
      after: fix.after,
      note: fix.note,
    });

    const fixed = applyReplacement(CASE_STUDY_CLAIMS, fix.before, fix.after, finding.span_start);
    expect(fixed).not.toBeNull();
    const after = runDeterministicValidators({ ...CASE_STUDY_SECTIONS, claims: fixed! }, "utility");
    const remaining = after.map((f) => f.title);
    expect(remaining).not.toContain(fix.title);
    expect(remaining.every((t) => TITLES.includes(t))).toBe(true);
  });

  it("quotes the flagged span back unchanged when no canned edit exists", () => {
    const { finding, system, prompt } = fixPrompt('Claim 5: "the base and" may lack antecedent basis');
    const flagged = CASE_STUDY_CLAIMS.slice(finding.span_start, finding.span_end);
    const proposal = parseFixResponse(demoGenerateText(system, prompt));
    expect(proposal).toEqual({ before: flagged, after: flagged, note: "" });
  });

  it("answers an unrecognized prompt with nothing", () => {
    expect(demoGenerateText(undefined, "Summarize this.")).toBe("");
  });
});

describe("demo §101 walkthrough", () => {
  it("parses as the walkthrough of claim 1, the claim the app picks", () => {
    const claim = pickIndependentClaim(parseClaims(CASE_STUDY_CLAIMS));
    expect(claim?.number).toBe(1);
    const { system, prompt } = buildEligibilityPrompt(claim!);
    expect(parseEligibilityResponse(demoGenerateText(system, prompt))).toEqual(eligibilityClaim1);
  });
});

describe("demo FIG. 1 read", () => {
  it("reads each numeral on the figure, repeats collapsed", () => {
    const numerals = new Set(demoDrawingVision().numerals.map((n) => n.numeral));
    expect([...numerals].sort()).toEqual(
      ["10", "12", "14", "16", "18", "20", "22", "24", "26", "28", "30", "32", "34", "36",
        "38", "40", "42", "44", "46", "48", "50", "52", "54"],
    );
  });

  it("flags the shading, the four undescribed numerals, and the undrawn handle", () => {
    const review = assembleDrawingReview({
      vision: demoDrawingVision(),
      disclosureComponents: CASE_STUDY_DISCLOSURE.components,
      specText: `${CASE_STUDY_SECTIONS.detailed_description}  ${CASE_STUDY_SECTIONS.summary}`,
      generalMpep: "608.02",
      numeralMpep: "608.01(g)",
      resolvedPins: new Set(["608.02", "608.01(g)"]),
    });
    expect(review.findings.map((f) => f.title)).toEqual([
      "Solid black shading on the lid rim",
      "Reference numeral 54 not described",
      "Reference numeral 46 not described",
      "Reference numeral 16 not described",
      "Reference numeral 44 not described",
    ]);
    expect(review.components.filter((c) => !c.shown).map((c) => c.name)).toEqual([
      "carrying handle",
    ]);
  });

  it("classifies the figure as a perspective view", () => {
    expect(demoDrawingView()).toEqual({ view: "perspective", confidence: 0.92 });
  });
});

describe("canned JSON", () => {
  it.each([
    ["vision-fig01.json", visionFig01],
    ["eligibility-claim1.json", eligibilityClaim1],
    ["fixes.json", fixes],
  ])("%s holds only text the output sanitizer leaves unchanged", (_, doc) => {
    const values = stringValues(doc);
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) expect(sanitizeOutputText(value)).toBe(value);
  });
});
