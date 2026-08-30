import { describe, expect, it } from "vitest";
import { isPointerStub, selectResponsivePassage } from "@/features/mpep/domain/highlight";

describe("isPointerStub", () => {
  it("treats empty and [Reserved]-style text as a stub", () => {
    expect(isPointerStub("")).toBe(true);
    expect(isPointerStub("   ")).toBe(true);
    expect(isPointerStub("[top]")).toBe(true);
    expect(isPointerStub("  [TOP]  ")).toBe(true);
  });

  it("treats a bare cross-reference as a stub", () => {
    expect(isPointerStub("See MPEP Chapter 2300.")).toBe(true);
    expect(isPointerStub("See MPEP § 1893.01(e).")).toBe(true);
    expect(isPointerStub("Refer to MPEP 706 for the full treatment.")).toBe(true);
    expect(isPointerStub("Note 37 CFR 1.104(a)(1).")).toBe(true);
    expect(isPointerStub("Reference is made to MPEP 2100.")).toBe(true);
  });

  it("treats a short line with no real substance as a stub", () => {
    expect(isPointerStub("Reserved.")).toBe(true);
  });

  it("keeps a definition that happens to end in a cross-reference", () => {
    expect(
      isPointerStub(
        "A combination is an organization of parts that cooperate. See MPEP 2100.",
      ),
    ).toBe(false);
  });

  it('strips a leading "For ..., see" clause before judging the remainder', () => {
    expect(isPointerStub("For the reissue practice, see MPEP Chapter 1400.")).toBe(true);
  });

  it("never calls a long passage a stub", () => {
    const long = "See MPEP 2300. " + "x".repeat(240);
    expect(long.trim().length).toBeGreaterThan(240);
    expect(isPointerStub(long)).toBe(false);
  });

  it("keeps substantive text with no referral at all", () => {
    expect(isPointerStub("The claim must particularly point out the subject matter.")).toBe(false);
  });

  it("ignores [top] markers when measuring the body", () => {
    expect(isPointerStub("The claim must particularly point out the subject matter. [top]")).toBe(
      false,
    );
  });
});

describe("selectResponsivePassage", () => {
  it("returns nothing when the query has no usable terms", () => {
    const text = "The claim must be definite.";
    expect(selectResponsivePassage(text, "")).toBeNull();
    expect(selectResponsivePassage(text, "the a of to in")).toBeNull();
    expect(selectResponsivePassage(text, "is it at")).toBeNull();
  });

  it("returns nothing when no line matches", () => {
    expect(selectResponsivePassage("The claim must be definite.", "flywheel gearbox")).toBeNull();
  });

  it("returns the offsets of the best-matching line", () => {
    const lines = [
      "Introductory material about filing.",
      "A claim must be definite about its scope and boundaries.",
      "Unrelated closing remark here.",
    ];
    const text = lines.join("\n");
    const span = selectResponsivePassage(text, "definite scope");
    expect(span).not.toBeNull();
    expect(text.slice(span!.start, span!.end)).toBe(lines[1]);
    expect(span!.start).toBe(lines[0].length + 1);
  });

  it("prefers a substantive line over a higher-scoring cross-reference", () => {
    const lines = [
      "The container is molded from fiber.",
      "See MPEP 2300 for container and liquid handling.",
    ];
    const text = lines.join("\n");
    const span = selectResponsivePassage(text, "container liquid");
    expect(text.slice(span!.start, span!.end)).toBe(lines[0]);
  });

  it("falls back to a cross-reference when nothing substantive matches", () => {
    const lines = [
      "An unrelated introductory sentence.",
      "See MPEP 2300 for container and liquid handling.",
    ];
    const text = lines.join("\n");
    const span = selectResponsivePassage(text, "container liquid");
    expect(text.slice(span!.start, span!.end)).toBe(lines[1]);
  });

  it("prefers the line matching more query terms", () => {
    const lines = [
      "The container is described in detail.",
      "The container holds the liquid without leaking.",
    ];
    const text = lines.join("\n");
    const span = selectResponsivePassage(text, "container liquid");
    expect(text.slice(span!.start, span!.end)).toBe(lines[1]);
  });

  it("breaks a tie on score by preferring the longer line", () => {
    const lines = [
      "The container is round.",
      "The container is round and is molded from recycled fiber stock.",
    ];
    const text = lines.join("\n");
    const span = selectResponsivePassage(text, "container");
    expect(text.slice(span!.start, span!.end)).toBe(lines[1]);
  });

  it("skips lines shorter than twelve characters", () => {
    const lines = ["container.", "The container is molded from fiber."];
    const text = lines.join("\n");
    const span = selectResponsivePassage(text, "container");
    expect(text.slice(span!.start, span!.end)).toBe(lines[1]);
  });

  it("matches case-insensitively and on partial words", () => {
    const text = "Introductory sentence.\nThe CONTAINERS are molded from fiber.";
    const span = selectResponsivePassage(text, "Container");
    expect(text.slice(span!.start, span!.end)).toBe("The CONTAINERS are molded from fiber.");
  });

  it("spans the untrimmed line so the offsets land in full_text", () => {
    const text = "Intro sentence here.\n   The container is molded from fiber.   ";
    const span = selectResponsivePassage(text, "container");
    expect(span!.start).toBe(text.indexOf("\n") + 1);
    expect(span!.end).toBe(text.length);
  });
});
