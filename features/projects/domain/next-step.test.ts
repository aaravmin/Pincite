import { describe, expect, it } from "vitest";
import { dashboardNextStep, nextStep } from "@/features/projects/domain/next-step";

describe("nextStep", () => {
  it("marks the two deadline-critical states urgent", () => {
    expect(nextStep("office_action")).toEqual({ label: "Reply to office action", urgent: true });
    expect(nextStep("allowed")).toEqual({ label: "Pay the issue fee", urgent: true });
  });

  it("returns a non-urgent step for every other status", () => {
    expect(nextStep("granted")).toEqual({ label: "Maintenance fees", urgent: false });
    expect(nextStep("filed")).toEqual({ label: "Awaiting examination", urgent: false });
    expect(nextStep("published")).toEqual({ label: "Awaiting examination", urgent: false });
    expect(nextStep("drafting")).toEqual({ label: "Drafting", urgent: false });
  });
});

describe("dashboardNextStep", () => {
  const ready = {
    status: "drafting" as const,
    draftComplete: true,
    inventorCount: 1,
    openIssues: 0,
    hasSignedDeclaration: true,
  };

  it("defers to the declared status once the matter is past drafting", () => {
    expect(dashboardNextStep({ ...ready, status: "office_action" })).toEqual({
      label: "Reply to office action",
      urgent: true,
    });
    expect(dashboardNextStep({ ...ready, status: "allowed" })).toEqual({
      label: "Pay the issue fee",
      urgent: true,
    });
    expect(dashboardNextStep({ ...ready, status: "granted" }).label).toBe("Maintenance fees");
    expect(dashboardNextStep({ ...ready, status: "filed" }).label).toBe("Awaiting examination");
    expect(dashboardNextStep({ ...ready, status: "published" }).label).toBe("Awaiting examination");
  });

  it("ignores drafting progress once the matter is filed", () => {
    expect(
      dashboardNextStep({
        status: "filed",
        draftComplete: false,
        inventorCount: 0,
        openIssues: 5,
        hasSignedDeclaration: false,
      }).label,
    ).toBe("Awaiting examination");
  });

  it("walks the drafting ladder in order", () => {
    expect(dashboardNextStep({ ...ready, draftComplete: false }).label).toBe("Finish the draft");
    expect(dashboardNextStep({ ...ready, inventorCount: 0 }).label).toBe("Add inventors");
    expect(dashboardNextStep({ ...ready, openIssues: 3 }).label).toBe("Fix 3 issues");
    expect(dashboardNextStep({ ...ready, hasSignedDeclaration: false }).label).toBe(
      "Sign the declaration",
    );
    expect(dashboardNextStep(ready).label).toBe("Export and file");
  });

  it("takes the earliest gap when several are open", () => {
    expect(
      dashboardNextStep({
        status: "drafting",
        draftComplete: false,
        inventorCount: 0,
        openIssues: 4,
        hasSignedDeclaration: false,
      }).label,
    ).toBe("Finish the draft");
  });

  it("singularizes a lone open issue", () => {
    expect(dashboardNextStep({ ...ready, openIssues: 1 }).label).toBe("Fix 1 issue");
    expect(dashboardNextStep({ ...ready, openIssues: 2 }).label).toBe("Fix 2 issues");
  });

  it("never marks a drafting step urgent", () => {
    for (const over of [
      { draftComplete: false },
      { inventorCount: 0 },
      { openIssues: 1 },
      { hasSignedDeclaration: false },
      {},
    ]) {
      expect(dashboardNextStep({ ...ready, ...over }).urgent).toBe(false);
    }
  });
});
