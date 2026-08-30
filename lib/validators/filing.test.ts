import { describe, expect, it } from "vitest";
import { runFilingChecks, type FilingFinding } from "@/lib/validators/filing";
import type { Project } from "@/lib/projects/types";
import type { Inventor } from "@/lib/filing/types";

const project = (over: Partial<Project> = {}): Project => ({
  id: "p1",
  user_id: "u1",
  name: "Matter",
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
  ...over,
});

const inventor = (over: Partial<Inventor> = {}): Inventor => ({
  id: "i1",
  project_id: "p1",
  legal_name: "Ada Byron",
  residence: "London, United Kingdom",
  mailing_address: "1 Analytical Way, London",
  citizenship: "GB",
  ord: 0,
  created_at: "2026-01-01T00:00:00Z",
  ...over,
});

const run = (over: Partial<Parameters<typeof runFilingChecks>[0]> = {}) =>
  runFilingChecks({
    project: project(),
    inventors: [inventor()],
    hasSignedDeclaration: true,
    role: "inventor",
    title: "Adjustable mount for a display arm",
    ...over,
  });

const titles = (findings: FilingFinding[]) => findings.map((f) => f.title);

describe("runFilingChecks - a complete filing", () => {
  it("returns nothing when the ADS, inventors and declaration are all in place", () => {
    expect(run()).toEqual([]);
  });

  it("does not vary with the viewer's role", () => {
    expect(run({ role: "attorney" })).toEqual(run({ role: "inventor" }));
    expect(run({ role: null })).toEqual(run({ role: "inventor" }));
  });
});

describe("runFilingChecks - inventors (37 CFR 1.76)", () => {
  it("flags an application with no inventor named", () => {
    const found = run({ inventors: [] });
    expect(found).toEqual([
      {
        severity: "violation",
        actionable: true,
        title: "No inventor named",
        explanation: "Name at least one inventor on the ADS.",
        mpep_section: "601.05(a)",
        cfr_ref: "37 CFR 1.76",
      },
    ]);
  });

  it("does not ask for a declaration when there is no inventor to sign one", () => {
    expect(titles(run({ inventors: [], hasSignedDeclaration: false }))).toEqual([
      "No inventor named",
    ]);
  });

  it("names a nameless inventor by position", () => {
    const found = run({ inventors: [inventor({ legal_name: "  ", residence: "", mailing_address: "" })] });
    expect(titles(found)).toEqual([
      "Inventor 1 is missing a legal name",
      "Inventor 1 is missing a residence",
      "Inventor 1 is missing a mailing address",
    ]);
    expect(found[0]).toMatchObject({
      severity: "violation",
      actionable: true,
      mpep_section: "601.05(a)",
      cfr_ref: "37 CFR 1.76(b)(1)",
    });
  });

  it("names a known inventor in the residence and address messages", () => {
    const found = run({ inventors: [inventor({ residence: "", mailing_address: "" })] });
    expect(titles(found)).toEqual([
      "Ada Byron is missing a residence",
      "Ada Byron is missing a mailing address",
    ]);
  });

  it("checks each inventor in turn", () => {
    const found = run({
      inventors: [inventor(), inventor({ id: "i2", legal_name: "Grace Hopper", residence: "" })],
    });
    expect(titles(found)).toEqual(["Grace Hopper is missing a residence"]);
  });

  it("does not require a citizenship", () => {
    expect(run({ inventors: [inventor({ citizenship: "" })] })).toEqual([]);
  });
});

describe("runFilingChecks - title and applicant", () => {
  it("flags a missing title as attention with no MPEP pin", () => {
    const found = run({ title: "   " });
    expect(found).toEqual([
      {
        severity: "attention",
        actionable: true,
        title: "Invention title is missing",
        explanation: "The ADS and draft both need the title.",
        mpep_section: null,
        cfr_ref: "37 CFR 1.76",
      },
    ]);
  });

  it("flags a missing applicant name when the applicant is not the inventor", () => {
    const found = run({ project: project({ applicant_is_inventor: false }) });
    expect(titles(found)).toEqual([
      "Applicant name is missing",
      "Record the assignment before the issue fee",
    ]);
    expect(found[0]).toMatchObject({
      severity: "violation",
      actionable: true,
      mpep_section: "601.05(a)",
      cfr_ref: "37 CFR 1.76(b)(7)",
    });
  });

  it("still reminds about the assignment once the applicant name is supplied", () => {
    const found = run({
      project: project({ applicant_is_inventor: false, applicant_name: "Analytical Engines Ltd" }),
    });
    expect(found).toEqual([
      {
        severity: "attention",
        actionable: false,
        title: "Record the assignment before the issue fee",
        explanation:
          "Record it at the USPTO by issue-fee payment for the assignee to appear on the patent.",
        mpep_section: "302",
        cfr_ref: "37 CFR 3.81",
      },
    ]);
  });
});

describe("runFilingChecks - the signed declaration (37 CFR 1.63)", () => {
  it("uses the singular voice for one inventor", () => {
    const found = run({ hasSignedDeclaration: false });
    expect(found).toEqual([
      {
        severity: "violation",
        actionable: true,
        title: "Signed inventor's declaration not uploaded",
        explanation:
          "The inventor signs an oath or declaration (PTO/AIA/01). Download it on the Sign step, sign by hand, and upload the signed copy.",
        mpep_section: "602",
        cfr_ref: "37 CFR 1.63",
      },
    ]);
  });

  it("uses the plural voice for joint inventors", () => {
    const found = run({
      hasSignedDeclaration: false,
      inventors: [inventor(), inventor({ id: "i2", legal_name: "Grace Hopper" })],
    });
    expect(found[0].explanation).toBe(
      "Each of the named inventors signs an oath or declaration (PTO/AIA/01). Download it on the Sign step, sign by hand, and upload the signed copy.",
    );
  });
});

describe("runFilingChecks - inventorship and entity status", () => {
  it("flags a company that is also named as the inventor", () => {
    const found = run({
      project: project({ applicant_is_juristic: true, applicant_is_inventor: true }),
    });
    expect(titles(found)).toEqual([
      "A company cannot also be the inventor",
      "A juristic applicant must be represented by a registered practitioner",
    ]);
    expect(found[0]).toMatchObject({
      severity: "attention",
      actionable: true,
      mpep_section: "2109",
      cfr_ref: "35 U.S.C. 100(f)",
    });
  });

  it("requires a registered practitioner for a juristic applicant", () => {
    const found = run({
      project: project({
        applicant_is_juristic: true,
        applicant_is_inventor: false,
        applicant_name: "Analytical Engines Ltd",
      }),
    });
    expect(titles(found)).toEqual([
      "Record the assignment before the issue fee",
      "A juristic applicant must be represented by a registered practitioner",
    ]);
    expect(found[1]).toMatchObject({
      severity: "attention",
      actionable: false,
      mpep_section: "402",
      cfr_ref: "37 CFR 1.33(b)",
    });
  });

  it("adds the micro entity certification reminder", () => {
    const found = run({ project: project({ entity_status: "micro" }) });
    expect(found).toEqual([
      {
        severity: "attention",
        actionable: false,
        title: "Micro entity status requires a certification",
        explanation:
          "File a micro-entity certification before paying micro-entity fees, and re-certify at each payment.",
        mpep_section: null,
        cfr_ref: "37 CFR 1.29",
      },
    ]);
  });

  it("adds the small entity certification reminder", () => {
    const found = run({ project: project({ entity_status: "small" }) });
    expect(titles(found)).toEqual(["Small entity status is a certification"]);
    expect(found[0]).toMatchObject({ mpep_section: null, cfr_ref: "37 CFR 1.27" });
  });

  it("adds no entity reminder for a large entity", () => {
    expect(run({ project: project({ entity_status: "large" }) })).toEqual([]);
  });
});
