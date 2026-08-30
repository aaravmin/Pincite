import { describe, expect, it } from "vitest";
import {
  summarizeDashboardProject,
  type DashboardRow,
} from "@/features/projects/domain/dashboard-summary";
import { REQUIRED_SECTION_KEYS } from "@/features/projects/domain/step-progress";
import type { Project } from "@/features/projects/domain/types";

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

const row = (over: Partial<DashboardRow> = {}): DashboardRow => ({
  project,
  sectionWords: {},
  sectionContent: {},
  versionCount: 0,
  hasDisclosure: false,
  inventorCount: 0,
  hasSignedDeclaration: false,
  ...over,
});

/** Every required section written to a plausible depth. */
const deepWords = Object.fromEntries(
  REQUIRED_SECTION_KEYS.map((k) => [k, 200]),
);

describe("summarizeDashboardProject", () => {
  it("carries the project fields through untouched", () => {
    const s = summarizeDashboardProject(row({ versionCount: 3 }));
    expect(s.id).toBe("p1");
    expect(s.name).toBe("Adjustable mount");
    expect(s.versionCount).toBe(3);
  });

  it("scores an empty matter at zero and a finished one at 100", () => {
    expect(summarizeDashboardProject(row()).completeness).toBe(0);
    expect(
      summarizeDashboardProject(
        row({
          sectionWords: deepWords,
          hasDisclosure: true,
          inventorCount: 1,
          hasSignedDeclaration: true,
        }),
      ).completeness,
    ).toBe(100);
  });

  it("detects the stage from which sections carry words", () => {
    expect(summarizeDashboardProject(row()).stage).toBe("Getting started");
    expect(
      summarizeDashboardProject(row({ sectionWords: deepWords })).stage,
    ).toBe("Pre-filing review");
  });

  it("counts live violations from the deterministic validators", () => {
    // A claim set with no claim 1 is a structural violation the Review screen also reports.
    const withIssue = summarizeDashboardProject(
      row({
        sectionWords: deepWords,
        inventorCount: 1,
        sectionContent: { claims: "2. The widget of claim 1." },
      }),
    );
    expect(withIssue.openIssues).toBeGreaterThan(0);
    expect(withIssue.next.label).toBe(`Fix ${withIssue.openIssues} issues`);
  });

  it("walks the real gaps rather than repeating the declared status", () => {
    expect(summarizeDashboardProject(row()).next).toEqual({
      label: "Finish the draft",
      urgent: false,
    });
    expect(
      summarizeDashboardProject(row({ sectionWords: deepWords })).next,
    ).toEqual({ label: "Add inventors", urgent: false });
    expect(
      summarizeDashboardProject(
        row({ sectionWords: deepWords, inventorCount: 1 }),
      ).next,
    ).toEqual({ label: "Sign the declaration", urgent: false });
    expect(
      summarizeDashboardProject(
        row({
          sectionWords: deepWords,
          inventorCount: 1,
          hasSignedDeclaration: true,
        }),
      ).next,
    ).toEqual({ label: "Export and file", urgent: false });
  });

  it("defers to the lifecycle once the matter is past drafting", () => {
    const s = summarizeDashboardProject(
      row({ project: { ...project, declared_status: "office_action" } }),
    );
    expect(s.next).toEqual({ label: "Reply to office action", urgent: true });
    expect(s.stage).toBe("Office action response");
  });

  it("does not let an advanced section alone complete the draft", () => {
    const s = summarizeDashboardProject(
      row({ sectionWords: { office_action: 400 } }),
    );
    expect(s.stage).toBe("Getting started");
    expect(s.next.label).toBe("Finish the draft");
  });
});
