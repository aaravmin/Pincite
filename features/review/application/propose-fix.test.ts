import { describe, expect, it, vi } from "vitest";
import type { TypedSupabaseClient } from "@/shared/db/types";
import {
  proposeFix,
  type ProposeFixDeps,
} from "@/features/review/application/propose-fix";

const supabase = {} as TypedSupabaseClient;

const allow = async () => ({ allowed: true, retryMessage: "" });

function makeDeps(overrides: Partial<ProposeFixDeps> = {}): ProposeFixDeps {
  return {
    checkRateLimit: allow as ProposeFixDeps["checkRateLimit"],
    checkGlobalLimit: allow as ProposeFixDeps["checkGlobalLimit"],
    loadDraft: async () => ({
      sections: { claims: "1. A device comprising a widget" },
      patentType: "utility",
    }),
    propose: async () =>
      '{"before":"a widget","after":"a widget.","note":"Added the terminal period."}',
    ...overrides,
  };
}

const input = {
  supabase,
  projectId: "p1",
  sectionKey: "claims",
  spanStart: 3,
  spanEnd: 30,
  title: "Claim 1 is not a single sentence",
  explanation: "Each claim ends in a period.",
  cfrRef: "37 CFR 1.75",
};

describe("proposeFix", () => {
  it("returns the model's exact before/after pair", async () => {
    const result = await proposeFix(input, makeDeps());
    expect(result).toEqual({
      ok: true,
      before: "a widget",
      after: "a widget.",
      note: "Added the terminal period.",
    });
  });

  it("marks the flagged span and names the section in the prompt", async () => {
    const propose = vi.fn<ProposeFixDeps["propose"]>(
      async () => '{"before":"a widget","after":"a widget."}',
    );
    await proposeFix(input, makeDeps({ propose }));

    const { system, prompt } = propose.mock.calls[0][0];
    expect(system).toContain("smallest possible edit");
    expect(prompt).toContain('flagged in the "Claims" section');
    expect(prompt).toContain("⟦");
    expect(prompt).toContain("(37 CFR 1.75)");
  });

  it("short-circuits on the hourly rate limit before loading anything", async () => {
    const loadDraft = vi.fn();
    const propose = vi.fn();
    const result = await proposeFix(
      input,
      makeDeps({
        checkRateLimit: (async () => ({
          allowed: false,
          retryMessage: "Too many fixes. Try again in 12 minutes.",
        })) as ProposeFixDeps["checkRateLimit"],
        loadDraft: loadDraft as unknown as ProposeFixDeps["loadDraft"],
        propose: propose as unknown as ProposeFixDeps["propose"],
      }),
    );

    expect(result).toEqual({ error: "Too many fixes. Try again in 12 minutes." });
    expect(loadDraft).not.toHaveBeenCalled();
    expect(propose).not.toHaveBeenCalled();
  });

  it("short-circuits on the daily budget cap before loading anything", async () => {
    const loadDraft = vi.fn();
    const result = await proposeFix(
      input,
      makeDeps({
        checkGlobalLimit: (async () => ({
          allowed: false,
          retryMessage: "",
        })) as ProposeFixDeps["checkGlobalLimit"],
        loadDraft: loadDraft as unknown as ProposeFixDeps["loadDraft"],
      }),
    );

    expect(result).toEqual({ error: "Daily AI budget used up. Try again tomorrow." });
    expect(loadDraft).not.toHaveBeenCalled();
  });

  it("refuses an empty section without calling the model", async () => {
    const propose = vi.fn();
    const result = await proposeFix(
      input,
      makeDeps({
        loadDraft: async () => ({ sections: { claims: "   " }, patentType: "utility" }),
        propose: propose as unknown as ProposeFixDeps["propose"],
      }),
    );

    expect(result).toEqual({ error: "No text in this section to fix." });
    expect(propose).not.toHaveBeenCalled();
  });

  it("reports unparsable model output rather than guessing", async () => {
    const result = await proposeFix(
      input,
      makeDeps({ propose: async () => "I am not able to help with that." }),
    );
    expect(result).toEqual({
      error: "Couldn't draft a precise fix - edit it by hand.",
    });
  });

  it("rejects a before that is not verbatim in the section", async () => {
    const result = await proposeFix(
      input,
      makeDeps({
        propose: async () => '{"before":"a sprocket","after":"a sprocket."}',
      }),
    );
    expect(result).toEqual({
      error: "Couldn't draft a precise fix - edit it by hand.",
    });
  });

  it("rejects a no-op edit", async () => {
    const result = await proposeFix(
      input,
      makeDeps({
        propose: async () => '{"before":"a widget","after":"a widget"}',
      }),
    );
    expect(result).toEqual({ error: "No change was proposed." });
  });

  it("reports a provider failure as a model error", async () => {
    const result = await proposeFix(
      input,
      makeDeps({
        propose: async () => {
          throw new Error("upstream 503");
        },
      }),
    );
    expect(result).toEqual({ error: "Model error: upstream 503" });
  });
});
