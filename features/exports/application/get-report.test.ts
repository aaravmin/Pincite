import { describe, expect, it, vi } from "vitest";
import { buildReportData } from "@/features/exports/application/get-report";
import type { ProjectSnapshot } from "@/features/projects/application/get-project-snapshot";
import type { FindingRow } from "@/features/review/domain/finding";
import type { ResultMatch } from "@/features/prior-art/domain/types";
import { SECTION_KEYS, type SectionKey } from "@/features/projects/domain/sections";
import type { Project } from "@/features/projects/domain/types";
import { emptyDisclosure } from "@/features/disclosure/domain/types";

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

const emptySections = Object.fromEntries(
  SECTION_KEYS.map((k) => [k, ""]),
) as Record<SectionKey, string>;

const snapshot: ProjectSnapshot = {
  project,
  sections: {
    ...emptySections,
    title: "Adjustable mount for a display arm",
    claims: "1. A mount comprising a base.",
  },
  inventors: [],
  attachments: [],
  disclosure: emptyDisclosure(),
  exports: [],
};

const finding: FindingRow = {
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
};

const match: ResultMatch = {
  id: "m1",
  patent_number: "US7654321B2",
  title: "Display support",
  source_url: "https://patents.google.com/patent/US7654321B2",
  overall_score: 0.8271,
  spans: [],
};

function deps(over: { snapshot?: ProjectSnapshot | null } = {}) {
  const loadSnapshot = vi.fn(async () =>
    over.snapshot === undefined ? snapshot : over.snapshot,
  );
  const loadFindings = vi.fn(async () => [finding]);
  const loadPriorArt = vi.fn(async () => ({ claims: "", matches: [match] }));
  return { loadSnapshot, loadFindings, loadPriorArt };
}

describe("buildReportData", () => {
  it("answers null when the matter is not visible to the viewer", async () => {
    expect(await buildReportData("p1", deps({ snapshot: null }))).toBeNull();
  });

  it("assembles the project, stage, findings, rules and prior art into one report", async () => {
    const report = (await buildReportData("p1", deps()))!;
    expect(report.project).toEqual(project);
    expect(report.stage.length).toBeGreaterThan(0);
    expect(report.findings).toEqual([finding]);
    expect(report.priorArt).toEqual([match]);
    expect(report.appliesNow.length).toBeGreaterThan(0);
  });

  it("lists only the sections that have content, with their labels", async () => {
    const report = (await buildReportData("p1", deps()))!;
    expect(report.sections.map((s) => s.key)).toEqual(["title", "claims"]);
    expect(report.sections[0].label).toBe("Title of the invention");
  });

  it("stamps the generation time as an ISO instant", async () => {
    const report = (await buildReportData("p1", deps()))!;
    expect(report.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("starts the three independent reads together", async () => {
    const d = deps();
    let resolveSnapshot: (s: ProjectSnapshot) => void = () => {};
    d.loadSnapshot.mockImplementation(
      () => new Promise<ProjectSnapshot>((r) => (resolveSnapshot = r)),
    );
    const pending = buildReportData("p1", d);
    // The findings and prior-art reads must already be in flight while the snapshot is
    // still outstanding; if they were sequenced behind it they would not have been called.
    await Promise.resolve();
    expect(d.loadFindings).toHaveBeenCalledTimes(1);
    expect(d.loadPriorArt).toHaveBeenCalledTimes(1);
    resolveSnapshot(snapshot);
    expect(await pending).not.toBeNull();
  });
});
