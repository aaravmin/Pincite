import { describe, expect, it } from "vitest";
import { detectStage, type StageInput } from "@/features/projects/domain/stage";

const input = (over: Partial<StageInput> = {}): StageInput => ({
  filled: [],
  declared_status: "drafting",
  application_number: null,
  filing_date: null,
  patent_type: "utility",
  ...over,
});

const ALL_UTILITY = [
  "title",
  "background",
  "summary",
  "detailed_description",
  "claims",
  "abstract",
];

describe("detectStage - declared lifecycle statuses", () => {
  it("reports maintenance for a granted patent", () => {
    expect(detectStage(input({ declared_status: "granted" }))).toEqual({
      label: "Granted - maintenance",
      signals: ["You marked this granted."],
      missing: [
        "Maintenance fees fall due at 3.5, 7.5, and 11.5 years (paid to the USPTO).",
      ],
    });
  });

  it("reports the issue fee for an allowed application", () => {
    expect(detectStage(input({ declared_status: "allowed" }))).toEqual({
      label: "Allowed - issue",
      signals: ["You marked a notice of allowance."],
      missing: ["Pay the issue fee to the USPTO to let the patent grant."],
    });
  });

  it("reports the reply clock for an outstanding office action", () => {
    const r = detectStage(input({ declared_status: "office_action" }));
    expect(r.label).toBe("Office action response");
    expect(r.missing).toEqual([
      "A shortened statutory period (commonly three months) runs from the action; calendar it.",
    ]);
  });

  it("reports published with nothing outstanding", () => {
    expect(detectStage(input({ declared_status: "published" }))).toEqual({
      label: "Published",
      signals: ["You marked this published (or 18 months have elapsed)."],
      missing: [],
    });
  });

  it("asks for the application number and filing date once filed", () => {
    expect(detectStage(input({ declared_status: "filed" }))).toEqual({
      label: "Filed - awaiting examination",
      signals: [
        "You marked this filed.",
        "No application number entered.",
        "No filing date entered.",
      ],
      missing: [
        "Enter the application number.",
        "Enter the filing date.",
        "Examination timing is controlled by the USPTO.",
      ],
    });
  });

  it("echoes the application number and filing date once entered", () => {
    expect(
      detectStage(
        input({
          declared_status: "filed",
          application_number: "18/123,456",
          filing_date: "2026-03-01",
        }),
      ),
    ).toEqual({
      label: "Filed - awaiting examination",
      signals: [
        "You marked this filed.",
        "Application number 18/123,456.",
        "Filing date 2026-03-01.",
      ],
      missing: ["Examination timing is controlled by the USPTO."],
    });
  });

  it("ignores drafted content once a lifecycle status is declared", () => {
    expect(detectStage(input({ declared_status: "granted", filled: ALL_UTILITY })).label).toBe(
      "Granted - maintenance",
    );
  });
});

describe("detectStage - utility drafting ladder", () => {
  it("reports getting started with nothing filled", () => {
    expect(detectStage(input())).toEqual({
      label: "Getting started",
      signals: ["No sections filled in yet."],
      missing: [
        "Start with the title and background, then the detailed description and claims.",
      ],
    });
  });

  it("reports plain drafting when only a stray section is filled", () => {
    const r = detectStage(input({ filled: ["background"] }));
    expect(r.label).toBe("Drafting");
    expect(r.signals).toEqual(["Some sections started."]);
    expect(r.missing).toEqual([
      "Add the Title of the invention.",
      "Add the Brief summary.",
      "Add the Detailed description.",
      "Add the Claims.",
      "Add the Abstract.",
    ]);
  });

  it("reports description drafting once the core description sections exist", () => {
    const r = detectStage(
      input({ filled: ["title", "detailed_description", "background"] }),
    );
    expect(r.label).toBe("Description drafting");
    expect(r.signals).toEqual(["The description sections are present; no claims yet."]);
    expect(r.missing).toEqual(["Add the Brief summary.", "Add the Claims.", "Add the Abstract."]);
  });

  it("accepts the summary in place of the background for the description core", () => {
    expect(
      detectStage(input({ filled: ["title", "detailed_description", "summary"] })).label,
    ).toBe("Description drafting");
  });

  it("falls back to plain drafting when the title is missing", () => {
    expect(detectStage(input({ filled: ["detailed_description", "background"] })).label).toBe(
      "Drafting",
    );
  });

  it("reports claims drafting once claims exist but parts remain", () => {
    const r = detectStage(input({ filled: ["title", "claims"] }));
    expect(r.label).toBe("Claims drafting");
    expect(r.signals).toEqual(["Claims are present; some required parts remain."]);
    expect(r.missing).toEqual([
      "Add the Background.",
      "Add the Brief summary.",
      "Add the Detailed description.",
      "Add the Abstract.",
    ]);
  });

  it("reports pre-filing review once every required section is filled", () => {
    expect(detectStage(input({ filled: ALL_UTILITY }))).toEqual({
      label: "Pre-filing review",
      signals: ["All required parts are present."],
      missing: [
        "Run the issue check and a prior-art search, then consider whether you are ready to file.",
      ],
    });
  });

  it("uses the utility ladder for a plant application", () => {
    expect(detectStage(input({ patent_type: "plant", filled: ALL_UTILITY })).label).toBe(
      "Pre-filing review",
    );
    expect(detectStage(input({ patent_type: "plant", filled: ["title", "claims"] })).label).toBe(
      "Claims drafting",
    );
  });
});

describe("detectStage - design drafting ladder", () => {
  const DESIGN_REQUIRED = ["title", "brief_description_drawings", "claims"];

  it("reports getting started with nothing filled", () => {
    expect(detectStage(input({ patent_type: "design" })).label).toBe("Getting started");
  });

  it("reports design drafting while a required part is missing", () => {
    const r = detectStage(input({ patent_type: "design", filled: ["title", "claims"] }));
    expect(r).toEqual({
      label: "Design drafting",
      signals: ["Design application; some required parts remain."],
      missing: ["Add the Brief description of the drawings."],
    });
  });

  it("reports pre-filing review on the three design sections alone", () => {
    expect(detectStage(input({ patent_type: "design", filled: DESIGN_REQUIRED }))).toEqual({
      label: "Pre-filing review",
      signals: ["Title, figure descriptions, and the single claim are present."],
      missing: [
        "Upload the drawings (they are the disclosure), run the issue check, then consider filing.",
      ],
    });
  });

  it("does not require the utility-only sections", () => {
    const r = detectStage(input({ patent_type: "design", filled: DESIGN_REQUIRED }));
    expect(r.missing.join(" ")).not.toContain("Abstract");
  });

  it("never reports claims drafting for a design application", () => {
    expect(detectStage(input({ patent_type: "design", filled: ["claims"] })).label).toBe(
      "Design drafting",
    );
  });
});
