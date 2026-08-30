import { describe, it, expect } from "vitest";
import {
  acceptDetectedView,
  VIEW_CONFIDENCE_THRESHOLD,
} from "@/features/drawings/domain/orientation";
import { ATTACHMENT_VIEWS } from "@/features/drawings/domain/types";

const views = ATTACHMENT_VIEWS as readonly string[];

describe("acceptDetectedView", () => {
  it("accepts a known view at or above the confidence gate", () => {
    expect(acceptDetectedView({ view: "front", confidence: 0.45 }, views)).toBe(
      "front",
    );
    expect(acceptDetectedView({ view: "top", confidence: 0.99 }, views)).toBe("top");
  });

  it("discards a read just below the gate", () => {
    expect(
      acceptDetectedView({ view: "front", confidence: 0.4499 }, views),
    ).toBe("");
  });

  it("discards a view that is not one of the standard views", () => {
    expect(acceptDetectedView({ view: "isometric", confidence: 1 }, views)).toBe("");
  });

  it("discards an empty view even at full confidence", () => {
    expect(acceptDetectedView({ view: "", confidence: 1 }, views)).toBe("");
  });

  it("gates at 0.45", () => {
    expect(VIEW_CONFIDENCE_THRESHOLD).toBe(0.45);
  });
});
