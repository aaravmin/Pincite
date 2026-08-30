import { describe, it, expect } from "vitest";
import {
  DISCLOSURE_FIELDS,
  emptyDisclosure,
  toDisclosure,
} from "@/features/disclosure/domain/types";

describe("toDisclosure", () => {
  it("returns every field empty when there is no row yet", () => {
    expect(toDisclosure(null)).toEqual(emptyDisclosure());
    expect(toDisclosure(undefined)).toEqual(emptyDisclosure());
  });

  it("copies each known field off the row", () => {
    const d = toDisclosure({
      field_industry: "Packaging",
      problem_solved: "Leaks",
      how_it_works: "A latch",
      components: "lid\nbase",
      advantages: "Cheaper",
      alternatives: "Metal",
      known_prior_art: "US 1234567",
    });
    expect(d.components).toBe("lid\nbase");
    expect(d.known_prior_art).toBe("US 1234567");
  });

  it("defaults a null or missing column to the empty string", () => {
    const d = toDisclosure({ problem_solved: null, components: "lid" });
    expect(d.problem_solved).toBe("");
    expect(d.field_industry).toBe("");
    expect(d.components).toBe("lid");
  });

  it("ignores columns that are not disclosure fields", () => {
    const d = toDisclosure({
      project_id: "p1",
      updated_at: "2026-01-01",
      components: "lid",
    } as Record<string, string>);
    expect(Object.keys(d).sort()).toEqual(
      DISCLOSURE_FIELDS.map((f) => f.key).sort(),
    );
  });

  it("gives every call a fresh object", () => {
    const a = toDisclosure(null);
    a.components = "changed";
    expect(toDisclosure(null).components).toBe("");
  });
});
