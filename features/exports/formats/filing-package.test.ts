import { describe, expect, it } from "vitest";
import {
  buildAdsText,
  buildDeclarationText,
  buildReadme,
  buildTransmittalAndFeesText,
} from "@/features/exports/formats/filing-package";
import { DECLARATION_STATEMENTS } from "@/features/filing/domain/declaration";
import type { Project } from "@/features/projects/domain/types";
import type { Inventor } from "@/features/filing/domain/types";

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

/** Every builder runs its output through the sanitizer, so none of these may appear. */
const BANNED = /[-‐-―−:;]/;

describe("buildAdsText", () => {
  it("carries the title, applicant, entity status and each inventor", () => {
    const text = buildAdsText(project(), [inventor()], "Adjustable mount for a display arm");
    expect(text).toContain("APPLICATION DATA SHEET (PTO/AIA/14)");
    expect(text).toContain("Invention title Adjustable mount for a display arm");
    expect(text).toContain("Applicant Ada Byron (individual inventor(s))");
    expect(text).toContain("Entity status Large entity");
    expect(text).toContain("1. Ada Byron");
    expect(text).toContain("Residence London, United Kingdom");
    expect(text).toContain("Mailing address 1 Analytical Way, London");
    expect(text).toContain("Citizenship GB");
    expect(text).toContain("Correspondence address confirm in Patent Center");
  });

  it("emits no banned output punctuation", () => {
    expect(buildAdsText(project(), [inventor()], "Widget: a self-locking mount")).not.toMatch(BANNED);
  });

  it("marks a missing title and a missing applicant", () => {
    const text = buildAdsText(project({ applicant_is_inventor: false }), [], "   ");
    expect(text).toContain("Invention title [not provided]");
    expect(text).toContain("Applicant [not provided]");
    expect(text).toContain("[none entered]");
  });

  it("labels a juristic applicant and uses its recorded name", () => {
    const text = buildAdsText(
      project({
        applicant_is_inventor: false,
        applicant_is_juristic: true,
        applicant_name: "Analytical Engines Ltd",
      }),
      [inventor()],
      "A mount",
    );
    expect(text).toContain("Applicant Analytical Engines Ltd (juristic entity)");
  });

  it("marks each missing inventor field", () => {
    const text = buildAdsText(
      project(),
      [inventor({ legal_name: "", residence: "", mailing_address: "", citizenship: "" })],
      "A mount",
    );
    expect(text).toContain("1. [name missing]");
    expect(text).toContain("Residence [missing]");
    expect(text).toContain("Mailing address [missing]");
    expect(text).toContain("Citizenship [not provided]");
  });

  it("numbers several inventors", () => {
    const text = buildAdsText(
      project(),
      [inventor(), inventor({ id: "i2", legal_name: "Grace Hopper" })],
      "A mount",
    );
    expect(text).toContain("1. Ada Byron");
    expect(text).toContain("2. Grace Hopper");
    expect(text).toContain("Applicant Ada Byron Grace Hopper");
  });

  it("reflects the selected entity status", () => {
    expect(buildAdsText(project({ entity_status: "small" }), [], "A mount")).toContain(
      "Entity status Small entity (37 CFR 1.27)",
    );
    expect(buildAdsText(project({ entity_status: "micro" }), [], "A mount")).toContain(
      "Entity status Micro entity (37 CFR 1.29)",
    );
  });
});

describe("buildDeclarationText", () => {
  it("reproduces the five 37 CFR 1.63 statements verbatim", () => {
    expect(DECLARATION_STATEMENTS).toEqual([
      "This application was made or authorized to be made by me.",
      "I believe I am the original inventor or an original joint inventor of a claimed invention in the application.",
      "I have reviewed and understand the contents of the application, including the claims.",
      "I am aware of the duty to disclose to the USPTO all information known to be material to patentability (37 CFR 1.56).",
      "I acknowledge that willful false statements are punishable under 18 U.S.C. 1001 by fine or imprisonment of up to 5 years, or both.",
    ]);
    const text = buildDeclarationText([inventor()], [], "A mount");
    // None of the statements carries banned punctuation, so each survives intact.
    for (const s of DECLARATION_STATEMENTS) expect(text).toContain(s);
    expect(text).toContain("INVENTOR'S DECLARATION (37 CFR 1.63 / PTO AIA 01)");
    expect(text).toContain("Each named inventor declares that");
  });

  it("lists the inventors who must sign", () => {
    const text = buildDeclarationText(
      [inventor(), inventor({ id: "i2", legal_name: "Grace Hopper" })],
      [],
      "A mount",
    );
    expect(text).toContain("Ada Byron");
    expect(text).toContain("Grace Hopper");
  });

  it("warns loudly when no signed declaration is bundled", () => {
    const text = buildDeclarationText([inventor()], [], "A mount");
    expect(text).toContain("NO SIGNED DECLARATION INCLUDED");
    expect(text).toContain("that signed copy is the");
    expect(text).not.toContain("declarations/");
  });

  it("names each bundled signed document instead", () => {
    const text = buildDeclarationText([inventor()], ["ada_byron.pdf", "grace_hopper.pdf"], "A mount");
    expect(text).toContain("declarations/ada_byron.pdf");
    expect(text).toContain("declarations/grace_hopper.pdf");
    expect(text).not.toContain("NO SIGNED DECLARATION INCLUDED");
  });

  it("marks a missing title and an unnamed inventor", () => {
    const text = buildDeclarationText([inventor({ legal_name: "" })], [], "  ");
    expect(text).toContain("Application title [not provided]");
    expect(text).toContain("[unnamed]");
  });

  it("says so when no inventor has been entered", () => {
    expect(buildDeclarationText([], [], "A mount")).toContain("[no inventors entered]");
  });

  it("emits no banned output punctuation", () => {
    expect(buildDeclarationText([inventor()], ["a.pdf"], "Widget: a mount")).not.toMatch(BANNED);
  });

  it("never claims to verify the signature", () => {
    const text = buildDeclarationText([inventor()], ["a.pdf"], "A mount");
    expect(text).toContain("The operative signature is the one each inventor places");
    expect(text).toContain("Pincite does not file for you");
  });
});

describe("buildTransmittalAndFeesText", () => {
  it("lists the package contents and the fee checklist", () => {
    const text = buildTransmittalAndFeesText(project());
    expect(text).toContain("UTILITY PATENT APPLICATION TRANSMITTAL (PTO/AIA/15)");
    expect(text).toContain("[x] Specification (specification.docx)");
    expect(text).toContain("[ ] Drawings (PDF)");
    expect(text).toContain("[x] Application Data Sheet data");
    expect(text).toContain("[ ] Fees");
    expect(text).toContain("Basic filing fee");
    expect(text).toContain("Search fee");
    expect(text).toContain("Examination fee");
    expect(text).toContain("Excess claims fees");
    expect(text).toContain("Entity status Large entity");
  });

  it("adds the micro entity certification line only for a micro entity", () => {
    expect(buildTransmittalAndFeesText(project({ entity_status: "micro" }))).toContain(
      "Micro entity file PTO/SB/15A or 15B",
    );
    expect(buildTransmittalAndFeesText(project({ entity_status: "small" }))).not.toContain(
      "PTO/SB/15A",
    );
    expect(buildTransmittalAndFeesText(project())).not.toContain("PTO/SB/15A");
  });

  it("emits no banned output punctuation", () => {
    expect(buildTransmittalAndFeesText(project({ entity_status: "micro" }))).not.toMatch(BANNED);
  });
});

describe("buildReadme", () => {
  it("walks the Patent Center filing steps in order", () => {
    const text = buildReadme();
    const steps = ["1.", "2.", "3.", "4.", "5.", "6.", "7."];
    const positions = steps.map((s) => text.indexOf(s));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(text).toContain("patentcenter.uspto.gov");
    expect(text).toContain("ID.me verification is required");
    expect(text).toContain("that converted file is the official record");
    expect(text).toContain("Pincite does not file for you");
    expect(text).toContain("no internal analysis");
  });

  it("emits no banned output punctuation", () => {
    expect(buildReadme()).not.toMatch(BANNED);
  });
});
