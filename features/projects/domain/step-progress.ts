/**
 * Per-step completion for one matter - the single source of the ticks on the step rail and
 * the "done" gates on the readiness overview.
 *
 * These two screens used to compute the same six flags from the same four data sets in two
 * places, and had already drifted apart (the rail read `disclosure.problem_solved.trim()`
 * where readiness read `disclosure.problem_solved?.trim()`, so a null column could throw in
 * the layout but not on the overview). The readiness semantics win here: `every()` over the
 * required sections rather than a filled-count comparison (equivalent), and optional
 * chaining on the disclosure fields (defensive, and the behavior the overview already had).
 *
 * PURE: plain data in, booleans out. No database, no framework.
 */
import {
  ADVANCED_SECTION_KEYS,
  SECTION_KEYS,
  type SectionKey,
} from "@/features/projects/domain/sections";
import type { AttachmentKind } from "@/lib/filing/types";
import type { Disclosure } from "@/lib/disclosure/types";

/** The steps that can be ticked. Review, rules, and prior art are not completion steps. */
export type StepProgress = {
  draft: boolean;
  disclosure: boolean;
  inventors: boolean;
  drawings: boolean;
  sign: boolean;
  submission: boolean;
};

/** Only the inventor fields the ADS requires before the step counts as done. */
type InventorFields = {
  legal_name: string;
  residence: string;
  mailing_address: string;
};

/** Only the attachment field the kind predicates need. */
type KindOnly = { kind: AttachmentKind };

export type StepProgressInput = {
  sections: Partial<Record<SectionKey, string>>;
  inventors: readonly InventorFields[];
  attachments: readonly KindOnly[];
  disclosure: Partial<Disclosure>;
  /** Whether this matter has produced at least one export. */
  hasExport: boolean;
};

/** Nothing ticked - the shape to render when there is no project to read. */
export const NO_STEPS_DONE: StepProgress = {
  draft: false,
  disclosure: false,
  inventors: false,
  drawings: false,
  sign: false,
  submission: false,
};

/** The spec sections a draft must contain; the advanced ones are stage-specific. */
export const REQUIRED_SECTION_KEYS: SectionKey[] = SECTION_KEYS.filter(
  (k) => !ADVANCED_SECTION_KEYS.has(k),
);

/**
 * "Signed" means the inventor's hand-signed declaration document has been uploaded - the
 * operative signature lives on that document, not on any in-app click, and Pincite never
 * verifies the signature itself. One named home for the predicate the rail, the readiness
 * gates, the filing checks, and the export all ask.
 */
export function hasSignedDeclaration(
  attachments: readonly KindOnly[],
): boolean {
  return attachments.some((a) => a.kind === "declaration");
}

/** How many uploaded figures this matter has. */
export function drawingCount(attachments: readonly KindOnly[]): number {
  return attachments.filter((a) => a.kind === "drawing").length;
}

export function stepProgress(input: StepProgressInput): StepProgress {
  const { sections, inventors, attachments, disclosure } = input;
  return {
    draft:
      REQUIRED_SECTION_KEYS.length > 0 &&
      REQUIRED_SECTION_KEYS.every((k) => (sections[k] ?? "").trim().length > 0),
    disclosure: !!(
      disclosure.problem_solved?.trim() &&
      disclosure.how_it_works?.trim() &&
      disclosure.components?.trim()
    ),
    inventors:
      inventors.length > 0 &&
      inventors.every(
        (i) =>
          i.legal_name.trim() && i.residence.trim() && i.mailing_address.trim(),
      ),
    drawings: drawingCount(attachments) > 0,
    // An uploaded declaration with no inventor on the ADS is not a signed application.
    sign: inventors.length > 0 && hasSignedDeclaration(attachments),
    submission: input.hasExport,
  };
}
