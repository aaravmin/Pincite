/**
 * `toText` only. `buildReportData` reaches Supabase for the project, sections, findings and
 * prior-art matches, so it belongs to an application-level test with fake repositories, not
 * here - these tests hand-build the Report it would have produced.
 */
import { describe, expect, it } from "vitest";
import { toText, type Report } from "@/features/exports/formats/txt";
import type { Project } from "@/features/projects/domain/types";
import type { FindingRow } from "@/features/review/domain/finding";
import type { ResultMatch } from "@/features/prior-art/domain/types";
import type { ConditionalRule, SurfacedRule } from "@/features/rules/domain/surface";

const project: Project = {
  id: "p1",
  user_id: "u1",
  name: "Display mount",
  patent_type: "utility",
  declared_status: "drafting",
  application_number: null,
  filing_date: null,
  applicant_name: null,
  applicant_is_inventor: true,
  applicant_is_juristic: false,
  entity_status: "large",
  client_name: null,
  matter_no: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const finding = (over: Partial<FindingRow> = {}): FindingRow => ({
  id: "f1",
  section_key: "claims",
  span_start: 0,
  span_end: 10,
  severity: "violation",
  kind: "structural",
  actionable: true,
  title: "Claim 5 must be in the alternative",
  explanation: "Refer to the claims in the alternative.",
  mpep_section: "608.01(n)",
  cfr_ref: "35 U.S.C. 112(e)",
  ...over,
});

const applies = (over: Partial<SurfacedRule> = {}): SurfacedRule => ({
  mpep_section: "2173",
  cfr_ref: "35 U.S.C. 112(b)",
  note: "Claims must be definite.",
  reason: "You're drafting.",
  actionable: true,
  ...over,
});

const conditional = (over: Partial<ConditionalRule> = {}): ConditionalRule => ({
  mpep_section: "2181",
  cfr_ref: "35 U.S.C. 112(f)",
  note: "Describe the structure that performs it.",
  actionable: true,
  trigger: "If a claim uses 'means for' wording",
  met: "A claim uses 'means for' wording",
  triggered: false,
  ...over,
});

const match = (over: Partial<ResultMatch> = {}): ResultMatch => ({
  id: "m1",
  patent_number: "US7654321B2",
  title: "Display support",
  source_url: "https://patents.google.com/patent/US7654321B2",
  overall_score: 0.8271,
  spans: [],
  ...over,
});

const report = (over: Partial<Report> = {}): Report => ({
  project,
  stage: "Claims drafting",
  generatedAt: "2026-08-29T12:00:00.000Z",
  sections: [],
  findings: [],
  appliesNow: [],
  conditional: [],
  priorArt: [],
  ...over,
});

describe("toText - header", () => {
  it("names the matter, its type, stage and generation time", () => {
    const text = toText(report());
    // The sanitizer removes the banned dashes and colons from the header lines.
    expect(text.split("\n")[0]).toBe("PINCITE REVIEW Display mount");
    expect(text).toContain(
      "Type utility · Stage Claims drafting · Generated 2026 08 29T12 00 00.000Z",
    );
  });

  it("carries the not-legal-advice line", () => {
    expect(toText(report())).toContain(
      "A research aid, not legal advice. Verify every item against the cited source.",
    );
  });

  it("emits no banned output punctuation anywhere", () => {
    const text = toText(
      report({
        sections: [{ key: "title", label: "Title of the invention", content: "Widget: a mount" }],
        findings: [finding()],
        appliesNow: [applies()],
        conditional: [conditional()],
        priorArt: [match()],
      }),
    );
    expect(text).not.toMatch(/[-‐-―−:;]/);
  });
});

describe("toText - draft", () => {
  it("prints each section under its label", () => {
    const text = toText(
      report({
        sections: [
          { key: "title", label: "Title of the invention", content: "  A display mount  " },
          { key: "claims", label: "Claims", content: "1. A mount comprising a base." },
        ],
      }),
    );
    expect(text).toContain("== DRAFT ==");
    expect(text).toContain("Title of the invention");
    expect(text).toContain("A display mount");
    expect(text).toContain("1. A mount comprising a base.");
  });
});

describe("toText - findings", () => {
  it("reports no findings explicitly", () => {
    const text = toText(report());
    expect(text).toContain("== FINDINGS ==");
    expect(text).toContain("(no findings)");
    expect(text).not.toContain("VIOLATIONS");
    expect(text).not.toContain("ATTENTION");
  });

  it("groups violations before attention items", () => {
    const text = toText(
      report({
        findings: [
          finding({ id: "f2", severity: "attention", title: "Relative term" }),
          finding(),
        ],
      }),
    );
    expect(text.indexOf("VIOLATIONS")).toBeLessThan(text.indexOf("ATTENTION"));
    expect(text).not.toContain("(no findings)");
  });

  it("marks each finding fixable or informational and pins it", () => {
    const text = toText(
      report({
        findings: [
          finding(),
          finding({ id: "f2", actionable: false, title: "Fee applies", severity: "attention" }),
        ],
      }),
    );
    expect(text).toContain("[FIXABLE] Claim 5 must be in the alternative");
    expect(text).toContain("[INFORMATIONAL] Fee applies");
    expect(text).toContain("35 U.S.C. 112(e) · MPEP 608.01(n)");
  });

  it("omits an absent pin rather than printing a placeholder", () => {
    const text = toText(report({ findings: [finding({ mpep_section: null })] }));
    expect(text).toContain("35 U.S.C. 112(e)");
    expect(text).not.toContain("MPEP");
  });

  it("drops a pass-severity finding from both groups", () => {
    const text = toText(report({ findings: [finding({ severity: "pass", title: "All good" })] }));
    expect(text).not.toContain("All good");
    expect(text).not.toContain("(no findings)");
  });
});

describe("toText - rules", () => {
  it("lists the applies-now rules with their pins", () => {
    const text = toText(report({ appliesNow: [applies()] }));
    expect(text).toContain("== RULES THAT APPLY NOW ==");
    expect(text).toContain("Claims must be definite. (35 U.S.C. 112(b) · MPEP 2173)");
  });

  it("omits the conditions-now-met block when nothing is triggered", () => {
    const text = toText(report({ conditional: [conditional()] }));
    expect(text).not.toContain("CONDITIONS NOW MET");
    expect(text).toContain("== RULES THAT MAY APPLY NEXT (NOT YET) ==");
    expect(text).toContain("If a claim uses 'means for' wording");
  });

  it("moves a triggered condition into its own present-tense block", () => {
    const text = toText(report({ conditional: [conditional({ triggered: true })] }));
    expect(text).toContain("== CONDITIONS NOW MET (THESE RULES NOW APPLY) ==");
    expect(text).toContain("A claim uses 'means for' wording");
    expect(text).not.toContain("If a claim uses 'means for' wording");
  });

  it("splits a mixed list between the two blocks", () => {
    const text = toText(
      report({
        conditional: [
          conditional({ triggered: true }),
          conditional({ mpep_section: "211", trigger: "If you claim priority", met: "You claim priority" }),
        ],
      }),
    );
    expect(text).toContain("A claim uses 'means for' wording");
    expect(text).toContain("If you claim priority");
    expect(text).not.toContain("You claim priority.");
  });
});

describe("toText - similar patents", () => {
  it("says nothing was run when there are no matches", () => {
    const text = toText(report());
    expect(text).toContain("== SIMILAR PATENTS ==");
    expect(text).toContain("(none run)");
  });

  it("lists each match with its rounded score", () => {
    const text = toText(report({ priorArt: [match()] }));
    expect(text).toContain("US7654321B2 Display support (score 0.83)");
  });

  it("handles a match with no score and no title", () => {
    const text = toText(report({ priorArt: [match({ overall_score: null, title: null })] }));
    expect(text).toContain("US7654321B2 (score )");
  });

  it("labels a whole-limitation overlap differently from shared wording", () => {
    const text = toText(
      report({
        priorArt: [
          match({
            spans: [
              {
                user_span_start: 0,
                user_span_end: 5,
                patent_span_text: "a base supporting an arm",
                overlap_type: "claim_limitation",
                element_confidence: 0.9,
              },
              {
                user_span_start: 6,
                user_span_end: 9,
                patent_span_text: "molded fiber",
                overlap_type: "lexical",
                element_confidence: null,
              },
            ],
          }),
        ],
      }),
    );
    expect(text).toContain("[covers a whole requirement of your claim] a base supporting an arm");
    expect(text).toContain("[shares wording] molded fiber");
  });

  it("truncates a long overlap span at 140 characters", () => {
    const long = "x".repeat(200);
    const text = toText(
      report({
        priorArt: [
          match({
            spans: [
              {
                user_span_start: 0,
                user_span_end: 5,
                patent_span_text: long,
                overlap_type: "semantic",
                element_confidence: null,
              },
            ],
          }),
        ],
      }),
    );
    expect(text).toContain("[shares wording] " + "x".repeat(140));
    expect(text).not.toContain("x".repeat(141));
  });

  it("closes with the research-signal disclaimer", () => {
    expect(toText(report())).toContain(
      "Research signal only. This is not a validity or freedom to operate opinion.",
    );
  });
});
