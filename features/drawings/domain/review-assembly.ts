/**
 * Turn one vision read of a figure into the drawing review the user sees. Pure: the caller
 * supplies the model output, the disclosed components, the draft text, and the set of MPEP
 * pins that resolved against the corpus, and gets back the finished DrawingReview.
 *
 * Three checks, each pinned to the rule it enforces:
 *  - every problem the model can actually see (37 CFR 1.84),
 *  - a missing figure label, since each view must be numbered (37 CFR 1.84(u)),
 *  - a reference numeral drawn on the figure but never mentioned in the draft (37 CFR
 *    1.84(p)) - the numeral and the description have to agree.
 * Component presence (37 CFR 1.83) is reported alongside, not as a finding.
 *
 * An MPEP pin that did not resolve is dropped to null; the finding still shows, but never
 * cites text that is not in the corpus.
 */
import type {
  DrawingFinding,
  DrawingReview,
} from "@/features/drawings/domain/types";

/** The structural shape of one vision read (mirrors shared/llm/vision's DrawingVision). */
export type VisionRead = {
  summary: string;
  figureLabel: string | null;
  numerals: { numeral: string; x: number; y: number }[];
  issues: { title: string; detail: string; x: number | null; y: number | null }[];
};

export type AssembleInput = {
  vision: VisionRead;
  /** The raw "Key components" disclosure text, one component per line/comma/semicolon. */
  disclosureComponents: string;
  /** The draft text a reference numeral may be described in. */
  specText: string;
  /** Governing MPEP section for drawings generally (design vs utility). */
  generalMpep: string;
  /** Governing MPEP section for reference numerals. */
  numeralMpep: string;
  /** The section numbers that resolved against the corpus. */
  resolvedPins: ReadonlySet<string>;
};

export function assembleDrawingReview(input: AssembleInput): DrawingReview {
  const { vision, generalMpep, numeralMpep, resolvedPins } = input;
  const pin = (nbr: string): string | null => (resolvedPins.has(nbr) ? nbr : null);

  // Component presence (37 CFR 1.83): each disclosed component should appear in the figure.
  const haystack = vision.summary.toLowerCase();
  const components = (input.disclosureComponents ?? "")
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3)
    .map((name) => {
      const term = name.toLowerCase().replace(/^(a|an|the)\s+/, "");
      const words = term.split(/\s+/);
      const probe = words[words.length - 1];
      const shown =
        probe.length >= 3 && (haystack.includes(probe) || haystack.includes(term));
      return { name, shown };
    });

  const findings: DrawingFinding[] = [];

  for (const [i, iss] of vision.issues.entries()) {
    findings.push({
      id: `issue-${i}`,
      title: iss.title || "Drawing issue",
      detail: iss.detail,
      cfr: "37 CFR 1.84",
      mpep: pin(generalMpep),
      x: iss.x,
      y: iss.y,
    });
  }

  if (!vision.figureLabel) {
    findings.push({
      id: "figlabel",
      title: "No figure label detected",
      detail:
        "No label such as FIG. 1 was found. Each view must be numbered (37 CFR 1.84(u)).",
      cfr: "37 CFR 1.84(u)",
      mpep: pin(generalMpep),
      x: null,
      y: null,
    });
  }

  // Reference numerals that appear in the drawing but never in the specification text.
  const specText = (input.specText ?? "").toLowerCase();
  const inSpec = (numeral: string): boolean => {
    const esc = numeral.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`).test(specText);
  };
  const seenNumerals = new Set<string>();
  let nIdx = 0;
  for (const num of vision.numerals) {
    const key = num.numeral.toLowerCase();
    if (seenNumerals.has(key)) continue;
    seenNumerals.add(key);
    if (inSpec(num.numeral)) continue;
    findings.push({
      id: `numeral-${nIdx++}`,
      title: `Reference numeral ${num.numeral} not described`,
      detail: `Numeral ${num.numeral} appears in the drawing but is not mentioned in your draft (37 CFR 1.84(p)).`,
      cfr: "37 CFR 1.84(p)",
      mpep: pin(numeralMpep),
      x: num.x,
      y: num.y,
    });
  }

  return {
    summary: vision.summary,
    figureLabel: vision.figureLabel,
    components,
    findings,
  };
}
