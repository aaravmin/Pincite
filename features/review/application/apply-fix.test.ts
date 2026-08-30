import { describe, expect, it, vi } from "vitest";
import type { TypedSupabaseClient } from "@/shared/db/types";
import { applyFix, type ApplyFixDeps } from "@/features/review/application/apply-fix";

const supabase = {} as TypedSupabaseClient;

function makeDeps(
  content: string,
  overrides: Partial<ApplyFixDeps> = {},
): { deps: ApplyFixDeps; saved: string[]; audits: unknown[]; recomputed: number } {
  const saved: string[] = [];
  const audits: unknown[] = [];
  const state = { recomputed: 0 };
  const deps: ApplyFixDeps = {
    loadDraft: async () => ({
      sections: { claims: content },
      patentType: "utility",
    }),
    saveSection: (async (_client, input) => {
      saved.push(input.content);
      return { error: null };
    }) as ApplyFixDeps["saveSection"],
    logAudit: (async (_client, params) => {
      audits.push({ action: params.action, detail: params.detail });
    }) as ApplyFixDeps["logAudit"],
    recompute: async () => {
      state.recomputed += 1;
      return { findings: [], dropped: 0 };
    },
    ...overrides,
  };
  return {
    deps,
    saved,
    audits,
    get recomputed() {
      return state.recomputed;
    },
  };
}

const base = {
  supabase,
  userId: "u1",
  projectId: "p1",
  sectionKey: "claims",
};

describe("applyFix", () => {
  it("replaces the occurrence nearest the flagged span, not the first match", async () => {
    const content = "1. The widget of claim 1.\n2. The widget again.";
    const harness = makeDeps(content);
    const result = await applyFix(
      { ...base, before: "widget", after: "gadget", spanStart: 40 },
      harness.deps,
    );

    expect(result).toEqual({ ok: true });
    expect(harness.saved).toEqual([
      "1. The widget of claim 1.\n2. The gadget again.",
    ]);
  });

  it("replaces the first occurrence when the span points at it", async () => {
    const harness = makeDeps("the widget, then the widget");
    await applyFix(
      { ...base, before: "widget", after: "gadget", spanStart: 4 },
      harness.deps,
    );
    expect(harness.saved).toEqual(["the gadget, then the widget"]);
  });

  it("refuses when the text moved on since the fix was drafted", async () => {
    const harness = makeDeps("1. A device comprising a base.");
    const result = await applyFix(
      { ...base, before: "a widget", after: "a widget.", spanStart: 0 },
      harness.deps,
    );

    expect(result).toEqual({ error: "Text changed since the fix - re-run it." });
    expect(harness.saved).toEqual([]);
    expect(harness.audits).toEqual([]);
    expect(harness.recomputed).toBe(0);
  });

  it("marks the audit entry as an auto-fix and names the section", async () => {
    const harness = makeDeps("a widget");
    await applyFix(
      { ...base, before: "widget", after: "gadget", spanStart: 2 },
      harness.deps,
    );
    expect(harness.audits).toEqual([
      { action: "section_edited", detail: { section: "claims", autofix: true } },
    ]);
  });

  it("recomputes the findings after the section is saved", async () => {
    const harness = makeDeps("a widget");
    await applyFix(
      { ...base, before: "widget", after: "gadget", spanStart: 2 },
      harness.deps,
    );
    expect(harness.recomputed).toBe(1);
  });

  it("surfaces a save failure and does not audit or recompute", async () => {
    const recompute = vi.fn();
    const harness = makeDeps("a widget", {
      saveSection: (async () => ({ error: "permission denied" })) as ApplyFixDeps["saveSection"],
      recompute: recompute as unknown as ApplyFixDeps["recompute"],
    });
    const result = await applyFix(
      { ...base, before: "widget", after: "gadget", spanStart: 2 },
      harness.deps,
    );

    expect(result).toEqual({ error: "permission denied" });
    expect(harness.audits).toEqual([]);
    expect(recompute).not.toHaveBeenCalled();
  });

  it("treats a missing section as empty text rather than crashing", async () => {
    const harness = makeDeps("anything");
    const result = await applyFix(
      { ...base, sectionKey: "abstract", before: "x", after: "y", spanStart: 0 },
      harness.deps,
    );
    expect(result).toEqual({ error: "Text changed since the fix - re-run it." });
  });
});
