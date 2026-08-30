import { describe, expect, it } from "vitest";
import {
  computeReadiness,
  type ReadinessInput,
} from "@/features/projects/domain/readiness";
import { REQUIRED_SECTION_KEYS } from "@/features/projects/domain/step-progress";
import type { Project } from "@/features/projects/domain/types";
import type { Finding } from "@/features/review/domain/finding";
import type { FilingFinding } from "@/features/review/domain/filing-checks";

const project: Project = {
  id: "p1",
  user_id: "u1",
  name: "Adjustable mount",
  patent_type: "utility",
  declared_status: "drafting",
  application_number: null,
  filing_date: null,
  applicant_name: null,
  applicant_is_inventor: true,
  applicant_is_juristic: false,
  entity_status: "micro",
  client_name: null,
  matter_no: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
};

const finding = (over: Partial<Finding> = {}): Finding => ({
  section_key: "claims",
  span_start: 10,
  span_end: 20,
  severity: "violation",
  kind: "structural",
  actionable: true,
  title: "A claim problem",
  explanation: "Why it matters.",
  mpep_section: "608.01(n)",
  cfr_ref: "37 CFR 1.75",
  ...over,
});

const filingFinding = (over: Partial<FilingFinding> = {}): FilingFinding => ({
  severity: "violation",
  actionable: true,
  title: "No inventor on the ADS",
  explanation: "Name at least one inventor.",
  mpep_section: "602",
  cfr_ref: "37 CFR 1.76",
  ...over,
});

const input = (over: Partial<ReadinessInput> = {}): ReadinessInput => ({
  project,
  sections: {},
  inventors: [],
  attachments: [],
  disclosure: {},
  hasExport: false,
  priorArtCount: 0,
  findings: [],
  filing: [],
  consistency: [],
  ...over,
});

const keys = (r: ReturnType<typeof computeReadiness>) =>
  r.gates.map((g) => g.key);

describe("computeReadiness - gates", () => {
  it("lists the nine steps in filing order when there is no disclosure", () => {
    expect(keys(computeReadiness(input()))).toEqual([
      "draft",
      "disclosure",
      "inventors",
      "drawings",
      "issues",
      "filing",
      "priorart",
      "sign",
      "export",
    ]);
  });

  it("splices consistency in after filing readiness once a disclosure exists", () => {
    const r = computeReadiness(
      input({ disclosure: { problem_solved: "It jams." } }),
    );
    expect(keys(r)).toEqual([
      "draft",
      "disclosure",
      "inventors",
      "drawings",
      "issues",
      "consistency",
      "filing",
      "priorart",
      "sign",
      "export",
    ]);
  });

  it("reports the issue gate red for a violation and yellow for an attention", () => {
    const red = computeReadiness(input({ findings: [finding()] }));
    expect(red.gates.find((g) => g.key === "issues")).toMatchObject({
      status: "violation",
      detail: "1 to fix",
    });

    const yellow = computeReadiness(
      input({ findings: [finding({ severity: "attention" })] }),
    );
    expect(yellow.gates.find((g) => g.key === "issues")).toMatchObject({
      status: "attention",
      detail: "1 to check",
    });

    const both = computeReadiness(
      input({
        findings: [finding(), finding({ severity: "attention", span_start: 3 })],
      }),
    );
    expect(both.gates.find((g) => g.key === "issues")?.detail).toBe(
      "1 to fix, 1 to check",
    );

    const clean = computeReadiness(input());
    expect(clean.gates.find((g) => g.key === "issues")).toMatchObject({
      status: "done",
      detail: "No issues found",
    });
  });

  it("marks the consistency gate as attention only while items remain", () => {
    const r = computeReadiness(
      input({
        disclosure: { problem_solved: "It jams." },
        consistency: [filingFinding({ severity: "attention" })],
      }),
    );
    expect(r.gates.find((g) => g.key === "consistency")).toMatchObject({
      status: "attention",
      detail: "1 to reconcile",
    });
  });
});

describe("computeReadiness - next step", () => {
  it("prefers a violation over anything unfinished", () => {
    const r = computeReadiness(input({ filing: [filingFinding()] }));
    expect(r.next).toEqual({
      label: "Filing readiness",
      href: "/projects/p1/sign",
    });
  });

  it("falls back to the first unfinished step", () => {
    expect(computeReadiness(input()).next).toEqual({
      label: "Draft",
      href: "/projects/p1",
    });
  });

  it("takes an attention gate only when nothing is red or unfinished", () => {
    const done = computeReadiness(
      input({
        sections: Object.fromEntries(
          REQUIRED_SECTION_KEYS.map((k) => [k, "written"]),
        ),
        inventors: [
          {
            legal_name: "Ada Lovelace",
            residence: "Providence, RI",
            mailing_address: "1 Main St",
          },
        ],
        attachments: [{ kind: "drawing" }, { kind: "declaration" }],
        disclosure: {
          problem_solved: "It jams.",
          how_it_works: "A cam.",
          components: "cam",
        },
        hasExport: true,
        priorArtCount: 2,
        consistency: [filingFinding({ severity: "attention" })],
      }),
    );
    expect(done.next).toEqual({
      label: "Consistency with the draft",
      href: "/projects/p1/disclosure",
    });
  });
});

describe("computeReadiness - metrics and findings", () => {
  it("counts red across the substantive and filing tiers", () => {
    const r = computeReadiness(
      input({
        findings: [finding(), finding({ severity: "attention", span_start: 4 })],
        filing: [filingFinding()],
        consistency: [filingFinding({ severity: "attention" })],
        priorArtCount: 3,
        attachments: [{ kind: "drawing" }, { kind: "drawing" }],
        disclosure: { problem_solved: "It jams." },
      }),
    );
    expect(r.metrics).toEqual({
      redIssues: 2,
      toFix: 1,
      toCheck: 1,
      filingFix: 1,
      consistency: 1,
      priorArt: 3,
      drawings: 2,
    });
  });

  it("deep-links a substantive finding at its span and a filing one at the sign step", () => {
    const r = computeReadiness(
      input({
        findings: [finding({ section_key: "abstract" })],
        filing: [filingFinding()],
      }),
    );
    expect(r.findings[0]).toMatchObject({
      area: "Specification",
      href: "/projects/p1?section=abstract&from=10&to=20",
    });
    expect(r.findings[1]).toMatchObject({
      area: "Filing",
      href: "/projects/p1/sign",
    });
  });

  it("files a claims finding under Claims", () => {
    const r = computeReadiness(input({ findings: [finding()] }));
    expect(r.findings[0].area).toBe("Claims");
  });

  it("has no deadline while drafting and surfaces one after filing", () => {
    expect(computeReadiness(input()).nextDeadline).toBeNull();
    const filed = computeReadiness(
      input({ project: { ...project, declared_status: "allowed" } }),
    );
    expect(filed.nextDeadline).toEqual({
      label: "3 months from the Notice of Allowance. This is not extendable",
      detail: "Pay the issue fee",
    });
  });

  it("shows the completeness percentage on an unfinished draft", () => {
    const r = computeReadiness(input());
    expect(r.completeness).toBe(0);
    expect(r.gates[0].detail).toBe("0% written");
  });
});
