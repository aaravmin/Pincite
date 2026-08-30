import "server-only";

/**
 * The vision adapter for figures: bytes in, a structured read out. The base64 encoding the
 * provider's data-URL format needs lives here, so the application layer never handles a
 * transport detail.
 *
 * CONFIDENTIALITY: a figure sent here is seen by the vendor and ZDR is not confirmed on, so
 * only public or synthetic figures may go through it (docs/business-context.md).
 */
import {
  analyzeDrawingVision,
  classifyDrawingView,
  type DrawingVision,
} from "@/shared/llm/vision";

export type { DrawingVision } from "@/shared/llm/vision";

export async function analyzeFigure(
  bytes: Buffer,
  mime: string,
): Promise<DrawingVision> {
  return analyzeDrawingVision(bytes.toString("base64"), mime);
}

export async function classifyFigureView(
  bytes: Buffer,
  mime: string,
): Promise<{ view: string; confidence: number }> {
  return classifyDrawingView(bytes.toString("base64"), mime);
}
