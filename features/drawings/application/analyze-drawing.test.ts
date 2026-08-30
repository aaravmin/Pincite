import { describe, it, expect, vi } from "vitest";
import {
  analyzeDrawing,
  type AnalyzeDrawingDeps,
} from "@/features/drawings/application/analyze-drawing";
import type { Attachment } from "@/features/drawings/domain/types";
import type { ProjectSnapshot } from "@/features/projects/application/get-project-snapshot";
import type { TypedSupabaseClient } from "@/shared/db/types";

const supabase = {} as TypedSupabaseClient;

const attachment = (p: Partial<Attachment> = {}): Attachment => ({
  id: "att-1",
  project_id: "proj-1",
  kind: "drawing",
  view: "front",
  storage_path: "proj-1/fig1.png",
  filename: "fig1.png",
  mime: "image/png",
  size_bytes: 100,
  created_at: "2026-01-01T00:00:00.000Z",
  analysis: null,
  annotations: null,
  page_index: null,
  ...p,
});

const snapshot = (p: Partial<ProjectSnapshot> = {}): ProjectSnapshot =>
  ({
    project: { patent_type: "utility" },
    sections: { detailed_description: "", drawings_meta: "", summary: "" },
    inventors: [],
    attachments: [],
    disclosure: { components: "" },
    exports: [],
    ...p,
  }) as unknown as ProjectSnapshot;

const vision = {
  summary: "A container with a lid.",
  figureLabel: "FIG. 1",
  numerals: [{ numeral: "16", x: 0.5, y: 0.5 }],
  issues: [],
};

function deps(over: Partial<AnalyzeDrawingDeps> = {}) {
  const base: AnalyzeDrawingDeps = {
    findAttachment: vi.fn(async () => attachment()),
    checkRateLimit: vi.fn(async () => ({ allowed: true, retryMessage: "" })),
    checkGlobalLimit: vi.fn(async () => ({ allowed: true, retryMessage: "" })),
    downloadObject: vi.fn(async () => ({ bytes: Buffer.from("png") })),
    analyzeFigure: vi.fn(async () => vision),
    loadSnapshot: vi.fn(async () => snapshot()),
    validateCitations: vi.fn(async () => new Set(["608.02", "608.01(g)"])),
    updateAttachmentAnalysis: vi.fn(async () => {}),
    logAudit: vi.fn(async () => {}),
  } as unknown as AnalyzeDrawingDeps;
  return { ...base, ...over };
}

const input = {
  supabase,
  userId: "user-1",
  projectId: "proj-1",
  attachmentId: "att-1",
};

describe("analyzeDrawing", () => {
  it("stops at the ownership check, before spending a rate-limit token", async () => {
    const d = deps({ findAttachment: vi.fn(async () => null) });
    expect(await analyzeDrawing(input, d)).toEqual({
      error: "Attachment not found.",
    });
    expect(d.checkRateLimit).not.toHaveBeenCalled();
    expect(d.downloadObject).not.toHaveBeenCalled();
    expect(d.analyzeFigure).not.toHaveBeenCalled();
  });

  it("refuses a non-image attachment without calling the model", async () => {
    const d = deps({
      findAttachment: vi.fn(async () => attachment({ mime: "application/pdf" })),
    });
    expect(await analyzeDrawing(input, d)).toEqual({
      error: "Only image figures can be reviewed.",
    });
    expect(d.checkRateLimit).not.toHaveBeenCalled();
    expect(d.analyzeFigure).not.toHaveBeenCalled();
  });

  it("returns the per-user rate-limit message and never calls the provider", async () => {
    const d = deps({
      checkRateLimit: vi.fn(async () => ({
        allowed: false,
        retryMessage: "Slow down.",
      })),
    });
    expect(await analyzeDrawing(input, d)).toEqual({ error: "Slow down." });
    expect(d.analyzeFigure).not.toHaveBeenCalled();
  });

  it("meters drawing_vision at 30 per hour and the global Grok budget per day", async () => {
    const d = deps();
    await analyzeDrawing(input, d);
    expect(d.checkRateLimit).toHaveBeenCalledWith(
      supabase,
      "drawing_vision",
      30,
      3600,
    );
    expect(d.checkGlobalLimit).toHaveBeenCalledWith(
      supabase,
      "grok_global_day",
      300,
      86400,
    );
  });

  it("blocks on the account-wide budget with its own message", async () => {
    const d = deps({
      checkGlobalLimit: vi.fn(async () => ({
        allowed: false,
        retryMessage: "ignored",
      })),
    });
    expect(await analyzeDrawing(input, d)).toEqual({
      error:
        "The daily AI budget for figure analysis is used up. Please try again tomorrow.",
    });
    expect(d.analyzeFigure).not.toHaveBeenCalled();
  });

  it("reports a storage read failure, falling back when there is no message", async () => {
    expect(
      await analyzeDrawing(
        input,
        deps({ downloadObject: vi.fn(async () => ({ error: "gone" })) }),
      ),
    ).toEqual({ error: "gone" });
    expect(
      await analyzeDrawing(
        input,
        deps({ downloadObject: vi.fn(async () => ({ error: null })) }),
      ),
    ).toEqual({ error: "Could not read the file." });
  });

  it("wraps a provider throw", async () => {
    const d = deps({
      analyzeFigure: vi.fn(async () => {
        throw new Error("429 rate limited");
      }),
    });
    expect(await analyzeDrawing(input, d)).toEqual({
      error: "Vision model error: 429 rate limited",
    });
  });

  it("rejects an empty read rather than persisting a blank review", async () => {
    const d = deps({
      analyzeFigure: vi.fn(async () => ({
        summary: "",
        figureLabel: null,
        numerals: [],
        issues: [],
      })),
    });
    expect(await analyzeDrawing(input, d)).toEqual({
      error: "The vision model returned nothing usable for this figure.",
    });
    expect(d.updateAttachmentAnalysis).not.toHaveBeenCalled();
  });

  it("persists the assembled review, audits it, and returns it", async () => {
    const d = deps({
      loadSnapshot: vi.fn(async () =>
        snapshot({
          disclosure: { components: "lid" },
          sections: { detailed_description: "The container 10." },
        } as unknown as Partial<ProjectSnapshot>),
      ),
    });
    const result = await analyzeDrawing(input, d);

    expect(result).toMatchObject({ ok: true, summary: "A container with a lid." });
    const review = {
      summary: "A container with a lid.",
      figureLabel: "FIG. 1",
      components: [{ name: "lid", shown: true }],
      findings: [
        {
          id: "numeral-0",
          title: "Reference numeral 16 not described",
          detail:
            "Numeral 16 appears in the drawing but is not mentioned in your draft (37 CFR 1.84(p)).",
          cfr: "37 CFR 1.84(p)",
          mpep: "608.01(g)",
          x: 0.5,
          y: 0.5,
        },
      ],
    };
    expect(d.updateAttachmentAnalysis).toHaveBeenCalledWith(
      "proj-1",
      "att-1",
      review,
    );
    expect(d.logAudit).toHaveBeenCalledWith(supabase, {
      userId: "user-1",
      action: "drawing_analyzed",
      projectId: "proj-1",
      detail: { attachmentId: "att-1", findings: 1, numerals: 1 },
    });
  });

  it("pins design drawings to MPEP 1503.02 and utility drawings to 608.02", async () => {
    const utility = deps();
    await analyzeDrawing(input, utility);
    expect(utility.validateCitations).toHaveBeenCalledWith([
      "608.02",
      "608.01(g)",
    ]);

    const design = deps({
      loadSnapshot: vi.fn(async () =>
        snapshot({ project: { patent_type: "design" } } as unknown as Partial<ProjectSnapshot>),
      ),
    });
    await analyzeDrawing(input, design);
    expect(design.validateCitations).toHaveBeenCalledWith([
      "1503.02",
      "608.01(g)",
    ]);
  });

  it("drops an MPEP pin that does not resolve against the corpus", async () => {
    const d = deps({ validateCitations: vi.fn(async () => new Set<string>()) });
    const result = await analyzeDrawing(input, d);
    expect(result).toMatchObject({ ok: true });
    if ("ok" in result) expect(result.findings[0].mpep).toBeNull();
  });
});
