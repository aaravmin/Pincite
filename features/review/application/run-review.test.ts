import { describe, expect, it, vi } from "vitest";
import type { TypedSupabaseClient } from "@/shared/db/types";
import type { Finding } from "@/features/review/domain/finding";
import {
  computeAndPersistFindings,
  runReview,
  type RunReviewDeps,
} from "@/features/review/application/run-review";

// A stand-in for the request-scoped Supabase client: the application layer only passes it
// through to the repositories, which are faked here, so nothing is ever queried.
const supabase = {} as TypedSupabaseClient;

/**
 * A draft with two seeded defects that carry MPEP pins: an over-length abstract (608.01(b))
 * and a claim with no terminal period (608.01(m)). Using the real validators keeps the test
 * honest about what a run actually produces.
 */
const DRAFT = {
  sections: {
    abstract: Array(160).fill("widget").join(" "),
    claims: "1. A device comprising a widget",
  },
  patentType: "utility" as const,
};

function makeDeps(overrides: Partial<RunReviewDeps> = {}) {
  const replaced: { projectId: string; findings: Finding[] }[] = [];
  const audits: { userId: string; action: string; detail: unknown }[] = [];
  const deps: RunReviewDeps = {
    loadDraft: async () => DRAFT,
    // Every pin resolves unless a test says otherwise.
    validateCitations: async (pins) => new Set(pins),
    replaceFindings: async (_client, projectId, findings) => {
      replaced.push({ projectId, findings });
    },
    logAudit: (async (_client, params) => {
      audits.push({
        userId: params.userId,
        action: params.action,
        detail: params.detail,
      });
    }) as RunReviewDeps["logAudit"],
    ...overrides,
  };
  return { deps, replaced, audits };
}

describe("computeAndPersistFindings", () => {
  it("runs the deterministic tiers over the loaded draft", async () => {
    const { deps, replaced } = makeDeps();
    const { findings, dropped } = await computeAndPersistFindings(
      { supabase, projectId: "p1" },
      deps,
    );

    expect(findings.length).toBeGreaterThan(0);
    expect(findings.some((f) => /Abstract is 160 words/.test(f.title))).toBe(true);
    expect(dropped).toBe(0);
    expect(replaced).toHaveLength(1);
    expect(replaced[0].projectId).toBe("p1");
    expect(replaced[0].findings).toEqual(findings);
  });

  it("nulls every pin the corpus does not have and counts each one", async () => {
    const { deps, replaced } = makeDeps({ validateCitations: async () => new Set() });
    const { findings, dropped } = await computeAndPersistFindings(
      { supabase, projectId: "p1" },
      deps,
    );

    expect(dropped).toBeGreaterThan(0);
    expect(findings.every((f) => f.mpep_section === null)).toBe(true);
    // What is persisted is the nulled list, never the unverified pins.
    expect(replaced[0].findings.every((f) => f.mpep_section === null)).toBe(true);
  });

  it("keeps a pin that resolves and drops only the one that does not", async () => {
    const { deps } = makeDeps({
      validateCitations: async () => new Set(["608.01(b)"]),
    });
    const { findings, dropped } = await computeAndPersistFindings(
      { supabase, projectId: "p1" },
      deps,
    );

    expect(findings.some((f) => f.mpep_section === "608.01(b)")).toBe(true);
    expect(findings.some((f) => f.mpep_section === null)).toBe(true);
    expect(dropped).toBe(
      findings.filter((f) => f.mpep_section === null).length,
    );
  });

  it("only asks the corpus about pins the findings actually carry", async () => {
    const validateCitations = vi.fn(async (pins: string[]) => new Set(pins));
    const { deps } = makeDeps({ validateCitations });
    await computeAndPersistFindings({ supabase, projectId: "p1" }, deps);

    const asked = validateCitations.mock.calls[0][0];
    expect(asked.every((p) => typeof p === "string" && p.length > 0)).toBe(true);
  });

  it("persists an empty list for a clean draft", async () => {
    const { deps, replaced } = makeDeps({
      loadDraft: async () => ({ sections: {}, patentType: "utility" as const }),
    });
    const { findings } = await computeAndPersistFindings(
      { supabase, projectId: "p1" },
      deps,
    );
    expect(findings).toEqual([]);
    expect(replaced[0].findings).toEqual([]);
  });

  it("does not audit - that is the caller's decision", async () => {
    const { deps, audits } = makeDeps();
    await computeAndPersistFindings({ supabase, projectId: "p1" }, deps);
    expect(audits).toEqual([]);
  });
});

describe("runReview", () => {
  it("audits the run with the finding count and the number of dropped pins", async () => {
    const { deps, audits } = makeDeps({ validateCitations: async () => new Set() });
    const { findings, dropped } = await runReview(
      { supabase, userId: "u1", projectId: "p1" },
      deps,
    );

    expect(audits).toHaveLength(1);
    expect(audits[0]).toEqual({
      userId: "u1",
      action: "findings_run",
      detail: { count: findings.length, dropped },
    });
    expect(dropped).toBeGreaterThan(0);
  });

  it("persists before it audits", async () => {
    const order: string[] = [];
    const { deps } = makeDeps({
      replaceFindings: async () => {
        order.push("persist");
      },
      logAudit: (async () => {
        order.push("audit");
      }) as RunReviewDeps["logAudit"],
    });
    await runReview({ supabase, userId: "u1", projectId: "p1" }, deps);
    expect(order).toEqual(["persist", "audit"]);
  });
});
