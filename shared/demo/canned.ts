/**
 * Precomputed provider output for demo mode (shared/demo/mode.ts). With no keys configured,
 * the generation and vision clients in shared/llm answer from here instead of calling a
 * vendor, so the auto fix, the §101 walkthrough, and the drawing check still show real
 * results on the public Apple container case study.
 *
 * Hand authored, because the repo stores no real model output for these calls: the read of
 * FIG. 1 (canned/vision-fig01.json), the §101 walkthrough of claim 1
 * (canned/eligibility-claim1.json), and one edit per fixable case study finding that has a
 * clean single-span fix (canned/fixes.json). Every value is text the output sanitizer leaves
 * unchanged, and every `before` is verbatim claim text; canned.test.ts asserts both.
 *
 * PURE: no I/O, no clock, no env. The provider clients decide when to answer from here.
 */
import { SPAN_CLOSE, SPAN_OPEN } from "@/features/review/domain/fix";
import type { DrawingVision } from "@/shared/llm/vision";
import eligibilityClaim1 from "@/shared/demo/canned/eligibility-claim1.json";
import fixes from "@/shared/demo/canned/fixes.json";
import visionFig01 from "@/shared/demo/canned/vision-fig01.json";

/** Unique to the §101 walkthrough system prompt (features/review/domain/eligibility.ts). */
const ELIGIBILITY_SYSTEM_MARK = "Alice/Mayo";
/** Unique to the guided fix system prompt (features/review/domain/fix.ts). */
const FIX_SYSTEM_MARK = "patent drafting assistant";

type CannedFix = { title: string; before: string; after: string; note: string };

const FIXES: readonly CannedFix[] = fixes;
const FIG01_VISION: DrawingVision = visionFig01;

/**
 * The answer a generation model would give for this system prompt and prompt, as the raw text
 * the callers parse: the §101 walkthrough JSON, a fix proposal JSON, or "" for anything else.
 */
export function demoGenerateText(system: string | undefined, prompt: string): string {
  if (system?.includes(ELIGIBILITY_SYSTEM_MARK)) return JSON.stringify(eligibilityClaim1);
  if (system?.includes(FIX_SYSTEM_MARK)) return JSON.stringify(proposeDemoFix(prompt));
  return "";
}

/**
 * The canned edit for the finding named on the prompt's "Defect: <title>." line. A finding
 * with no canned edit gets its flagged span quoted back unchanged, which the fix flow
 * reports as "No change was proposed." rather than inventing an edit.
 */
function proposeDemoFix(prompt: string): Omit<CannedFix, "title"> {
  const defect = prompt.split("\n").find((line) => line.startsWith("Defect: ")) ?? "";
  const fix = FIXES.find((f) => defect.startsWith(`Defect: ${f.title}.`));
  if (fix) return { before: fix.before, after: fix.after, note: fix.note };
  const flagged = flaggedSpan(prompt);
  return { before: flagged, after: flagged, note: "" };
}

/**
 * The text between the span markers inside the prompt's SECTION block. The instructions
 * around that block mention the markers too, so the search starts at the block.
 */
function flaggedSpan(prompt: string): string {
  const section = prompt.indexOf("\nSECTION:\n");
  if (section < 0) return "";
  const open = prompt.indexOf(SPAN_OPEN, section);
  const close = open < 0 ? -1 : prompt.indexOf(SPAN_CLOSE, open + SPAN_OPEN.length);
  return close < 0 ? "" : prompt.slice(open + SPAN_OPEN.length, close);
}

/** The structured read of FIG. 1 of US 2012/0024859 A1, as the vision model would return it. */
export function demoDrawingVision(): DrawingVision {
  return structuredClone(FIG01_VISION);
}

/** The projection FIG. 1 shows, as the view classifier would return it. */
export function demoDrawingView(): { view: string; confidence: number } {
  return { view: "perspective", confidence: 0.92 };
}
