import { describe, expect, it, vi } from "vitest";
import type { TypedSupabaseClient } from "@/shared/db/types";
import {
  analyzeEligibility,
  type AnalyzeEligibilityDeps,
} from "@/features/review/application/analyze-eligibility";

const supabase = {} as TypedSupabaseClient;
const allow = async () => ({ allowed: true, retryMessage: "" });

const ANSWER = JSON.stringify({
  category: "process",
  prong_one: "recites an abstract idea",
  prong_two: "integrated into a practical application",
  step_2b: "adds significantly more",
  summary: "The claim sits at Step 2A prong two.",
});

function makeDeps(
  overrides: Partial<AnalyzeEligibilityDeps> = {},
): AnalyzeEligibilityDeps {
  return {
    loadDraft: async () => ({
      sections: {
        claims:
          "1. A method comprising steps.\n2. The method of claim 1, wherein it is fast.",
      },
      patentType: "utility",
    }),
    checkRateLimit: allow as AnalyzeEligibilityDeps["checkRateLimit"],
    checkGlobalLimit: allow as AnalyzeEligibilityDeps["checkGlobalLimit"],
    analyze: async () => ANSWER,
    validateCitations: async (pins) => new Set(pins),
    logAudit: (async () => {}) as AnalyzeEligibilityDeps["logAudit"],
    ...overrides,
  };
}

const input = { supabase, userId: "u1", projectId: "p1" };

describe("analyzeEligibility", () => {
  it("walks the framework for the independent claim", async () => {
    const result = await analyzeEligibility(input, makeDeps());
    expect(result).toEqual({
      ok: true,
      claimNumber: 1,
      claimText: "A method comprising steps.",
      analysis: {
        category: "process",
        prong_one: "recites an abstract idea",
        prong_two: "integrated into a practical application",
        step_2b: "adds significantly more",
        summary: "The claim sits at Step 2A prong two.",
      },
      mpep: "2106",
    });
  });

  it("drops the MPEP 2106 pin when the corpus does not have it", async () => {
    const result = await analyzeEligibility(
      input,
      makeDeps({ validateCitations: async () => new Set() }),
    );
    expect(result).toMatchObject({ ok: true, mpep: null });
  });

  it("asks for claims before spending any quota", async () => {
    const checkRateLimit = vi.fn(allow);
    const result = await analyzeEligibility(
      input,
      makeDeps({
        loadDraft: async () => ({ sections: {}, patentType: "utility" }),
        checkRateLimit:
          checkRateLimit as unknown as AnalyzeEligibilityDeps["checkRateLimit"],
      }),
    );

    expect(result).toEqual({ error: "Add claims first." });
    expect(checkRateLimit).not.toHaveBeenCalled();
  });

  it("reports the rate-limit message and never calls the model", async () => {
    const analyze = vi.fn();
    const result = await analyzeEligibility(
      input,
      makeDeps({
        checkRateLimit: (async () => ({
          allowed: false,
          retryMessage: "Too many checks. Try again in 20 minutes.",
        })) as AnalyzeEligibilityDeps["checkRateLimit"],
        analyze: analyze as unknown as AnalyzeEligibilityDeps["analyze"],
      }),
    );

    expect(result).toEqual({
      error: "Too many checks. Try again in 20 minutes.",
    });
    expect(analyze).not.toHaveBeenCalled();
  });

  it("stops at the daily budget cap", async () => {
    const result = await analyzeEligibility(
      input,
      makeDeps({
        checkGlobalLimit: (async () => ({
          allowed: false,
          retryMessage: "",
        })) as AnalyzeEligibilityDeps["checkGlobalLimit"],
      }),
    );
    expect(result).toEqual({
      error: "Daily §101 budget used up. Try again tomorrow.",
    });
  });

  it("reports malformed model output as a model error", async () => {
    const result = await analyzeEligibility(
      input,
      makeDeps({ analyze: async () => "{ not json }" }),
    );
    expect("error" in result && result.error.startsWith("Model error:")).toBe(true);
  });

  it("audits the walkthrough with the claim it read", async () => {
    const audits: unknown[] = [];
    await analyzeEligibility(
      input,
      makeDeps({
        logAudit: (async (_client, params) => {
          audits.push({ action: params.action, detail: params.detail });
        }) as AnalyzeEligibilityDeps["logAudit"],
      }),
    );
    expect(audits).toEqual([
      { action: "findings_run", detail: { kind: "eligibility", claim: 1 } },
    ]);
  });
});
