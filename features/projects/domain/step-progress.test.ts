import { describe, expect, it } from "vitest";
import {
  NO_STEPS_DONE,
  REQUIRED_SECTION_KEYS,
  drawingCount,
  hasSignedDeclaration,
  stepProgress,
  type StepProgressInput,
} from "@/features/projects/domain/step-progress";

const fullSections = Object.fromEntries(
  REQUIRED_SECTION_KEYS.map((k) => [k, "written"]),
);

const fullInventor = {
  legal_name: "Ada Lovelace",
  residence: "Providence, RI",
  mailing_address: "1 Main St, Providence, RI",
};

const input = (over: Partial<StepProgressInput> = {}): StepProgressInput => ({
  sections: {},
  inventors: [],
  attachments: [],
  disclosure: {},
  hasExport: false,
  ...over,
});

describe("attachment predicates", () => {
  it("reads 'signed' as an uploaded declaration document", () => {
    expect(hasSignedDeclaration([{ kind: "drawing" }])).toBe(false);
    expect(
      hasSignedDeclaration([{ kind: "drawing" }, { kind: "declaration" }]),
    ).toBe(true);
  });

  it("counts only the figures", () => {
    expect(
      drawingCount([
        { kind: "drawing" },
        { kind: "drawing" },
        { kind: "supporting" },
        { kind: "declaration" },
      ]),
    ).toBe(2);
  });
});

describe("stepProgress", () => {
  it("ticks nothing for an empty matter", () => {
    expect(stepProgress(input())).toEqual(NO_STEPS_DONE);
  });

  it("ticks the draft only when every required section has content", () => {
    const missingOne = { ...fullSections };
    delete missingOne[REQUIRED_SECTION_KEYS[0]];
    expect(stepProgress(input({ sections: missingOne })).draft).toBe(false);
    // Whitespace is not content.
    expect(
      stepProgress(input({ sections: { ...fullSections, claims: "   " } })).draft,
    ).toBe(false);
    expect(stepProgress(input({ sections: fullSections })).draft).toBe(true);
  });

  it("does not count the advanced sections against the draft", () => {
    // office_action is stage-specific, so a complete draft never waits on it.
    expect(REQUIRED_SECTION_KEYS).not.toContain("office_action");
    expect(stepProgress(input({ sections: fullSections })).draft).toBe(true);
  });

  it("needs the three substantive disclosure answers", () => {
    expect(
      stepProgress(
        input({
          disclosure: { problem_solved: "p", how_it_works: "h" },
        }),
      ).disclosure,
    ).toBe(false);
    expect(
      stepProgress(
        input({
          disclosure: { problem_solved: "p", how_it_works: "h", components: "c" },
        }),
      ).disclosure,
    ).toBe(true);
  });

  it("survives a null disclosure column rather than throwing", () => {
    // The rail used to read `disclosure.problem_solved.trim()` and could throw here.
    const nulled = {
      problem_solved: null,
      how_it_works: null,
      components: null,
    } as unknown as StepProgressInput["disclosure"];
    expect(stepProgress(input({ disclosure: nulled })).disclosure).toBe(false);
  });

  it("needs every inventor to carry the ADS fields", () => {
    expect(stepProgress(input({ inventors: [fullInventor] })).inventors).toBe(true);
    expect(
      stepProgress(
        input({ inventors: [fullInventor, { ...fullInventor, residence: " " }] }),
      ).inventors,
    ).toBe(false);
  });

  it("does not treat a declaration with no inventor as signed", () => {
    expect(
      stepProgress(input({ attachments: [{ kind: "declaration" }] })).sign,
    ).toBe(false);
    expect(
      stepProgress(
        input({
          inventors: [fullInventor],
          attachments: [{ kind: "declaration" }],
        }),
      ).sign,
    ).toBe(true);
  });

  it("ticks drawings and submission from the figures and the export history", () => {
    const done = stepProgress(
      input({ attachments: [{ kind: "drawing" }], hasExport: true }),
    );
    expect(done.drawings).toBe(true);
    expect(done.submission).toBe(true);
  });
});
