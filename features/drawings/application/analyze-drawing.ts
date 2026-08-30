import "server-only";

/**
 * Review an uploaded figure with a vision model for drawing-compliance defects under 37 CFR
 * 1.84 and 1.83: describe it, check each disclosed component appears, flag reference numerals
 * that are in the drawing but not the specification, flag a missing figure label, and pass
 * through any problems the model can see - each with an approximate location for an on-figure
 * red circle. Public or synthetic figures only until vendor ZDR is on.
 *
 * The assembly itself is pure (domain/review-assembly); this operation authorizes, meters,
 * fetches, and persists.
 */
import { logAudit } from "@/shared/audit/log";
import { checkGlobalLimit, checkRateLimit } from "@/shared/rate-limit/check";
import type { TypedSupabaseClient } from "@/shared/db/types";
import { validateCitations } from "@/features/mpep/application/validate-citations";
import { getProjectSnapshot } from "@/features/projects/application/get-project-snapshot";
import { assembleDrawingReview } from "@/features/drawings/domain/review-assembly";
import type { DrawingReview } from "@/features/drawings/domain/types";
import {
  findAttachment,
  updateAttachmentAnalysis,
} from "@/features/drawings/infrastructure/attachment-repository";
import { downloadObject } from "@/features/drawings/infrastructure/storage";
import { analyzeFigure } from "@/features/drawings/infrastructure/vision-provider";

export type AnalyzeDrawingInput = {
  supabase: TypedSupabaseClient;
  userId: string;
  projectId: string;
  attachmentId: string;
};

export type AnalyzeDrawingDeps = {
  findAttachment: typeof findAttachment;
  checkRateLimit: typeof checkRateLimit;
  checkGlobalLimit: typeof checkGlobalLimit;
  downloadObject: typeof downloadObject;
  analyzeFigure: typeof analyzeFigure;
  loadSnapshot: typeof getProjectSnapshot;
  validateCitations: typeof validateCitations;
  updateAttachmentAnalysis: typeof updateAttachmentAnalysis;
  logAudit: typeof logAudit;
};

const defaultDeps: AnalyzeDrawingDeps = {
  findAttachment,
  checkRateLimit,
  checkGlobalLimit,
  downloadObject,
  analyzeFigure,
  loadSnapshot: getProjectSnapshot,
  validateCitations,
  updateAttachmentAnalysis,
  logAudit,
};

export async function analyzeDrawing(
  input: AnalyzeDrawingInput,
  deps: AnalyzeDrawingDeps = defaultDeps,
): Promise<({ ok: true } & DrawingReview) | { error: string }> {
  const { supabase, projectId, attachmentId } = input;

  const att = await deps.findAttachment(supabase, projectId, attachmentId);
  if (!att) return { error: "Attachment not found." };
  if (!att.mime.startsWith("image/")) {
    return { error: "Only image figures can be reviewed." };
  }

  const rl = await deps.checkRateLimit(supabase, "drawing_vision", 30, 3600);
  if (!rl.allowed) return { error: rl.retryMessage };
  const budget = await deps.checkGlobalLimit(supabase, "grok_global_day", 300, 86400);
  if (!budget.allowed)
    return { error: "The daily AI budget for figure analysis is used up. Please try again tomorrow." };

  const file = await deps.downloadObject(att.storage_path);
  if ("error" in file) {
    return { error: file.error ?? "Could not read the file." };
  }

  let vision;
  try {
    vision = await deps.analyzeFigure(file.bytes, att.mime);
  } catch (e) {
    return { error: `Vision model error: ${(e as Error).message}` };
  }
  if (!vision.summary && vision.numerals.length === 0 && vision.issues.length === 0) {
    return { error: "The vision model returned nothing usable for this figure." };
  }

  const snapshot = await deps.loadSnapshot(projectId);

  // Patent type selects the governing MPEP for drawings (design vs utility). Pins are
  // corpus-validated; an unresolved one is dropped to null but the finding still shows.
  const generalMpep =
    snapshot?.project.patent_type === "design" ? "1503.02" : "608.02";
  const numeralMpep = "608.01(g)";
  const resolvedPins = await deps.validateCitations([generalMpep, numeralMpep]);

  const sections = snapshot?.sections;
  const review = assembleDrawingReview({
    vision,
    disclosureComponents: snapshot?.disclosure.components ?? "",
    specText:
      (sections?.detailed_description ?? "") +
      " " +
      (sections?.drawings_meta ?? "") +
      " " +
      (sections?.summary ?? ""),
    generalMpep,
    numeralMpep,
    resolvedPins,
  });

  // Persist the review so the issues flagged on this figure survive a page leave.
  await deps.updateAttachmentAnalysis(projectId, attachmentId, review);

  await deps.logAudit(supabase, {
    userId: input.userId,
    action: "drawing_analyzed",
    projectId,
    detail: {
      attachmentId,
      findings: review.findings.length,
      numerals: vision.numerals.length,
    },
  });

  return { ok: true, ...review };
}
