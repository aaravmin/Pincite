/**
 * The structured-intake section model (roadmap §4.1). Section content is stored as a
 * raw plain-text string so character offsets stay stable for later finding/highlight
 * spans - see docs/style-guide.md.
 */

export const SECTION_KEYS = [
  "title",
  "cross_reference",
  "gov_interest",
  "background",
  "summary",
  "brief_description_drawings",
  "detailed_description",
  "claims",
  "abstract",
  "drawings_meta",
  "office_action",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export const SECTION_LABELS: Record<SectionKey, string> = {
  title: "Title of the invention",
  cross_reference: "Cross-reference to related applications",
  gov_interest: "Federally sponsored R&D",
  background: "Background",
  summary: "Brief summary",
  brief_description_drawings: "Brief description of the drawings",
  detailed_description: "Detailed description",
  claims: "Claims",
  abstract: "Abstract",
  drawings_meta: "Drawings metadata",
  office_action: "Office action",
};

/** Short, neutral guidance shown under each section heading. No legal advice. */
export const SECTION_HINTS: Partial<Record<SectionKey, string>> = {
  title:
    "A specific technical name, not a brand. E.g. 'Adjustable mount for a display arm'.",
  cross_reference:
    "Any earlier filing you claim priority to, and its number, or 'Not applicable'.",
  gov_interest:
    "If US-government-funded, name the agency and contract number; else 'Not applicable'.",
  background: "The field, the problem, and why existing solutions fall short.",
  summary: "A high-level description of what the invention is and does.",
  brief_description_drawings:
    "One short line per figure, e.g. 'FIG. 1 is a perspective view of the container.'",
  detailed_description:
    "How to make and use it, introducing each part with a reference numeral (base 10, arm 12) matching the drawings.",
  claims:
    "What you're protecting. One numbered claim per block, each one sentence. Claim 1 stands alone; a dependent claim builds on an earlier one.",
  abstract: "One paragraph, 150 words or fewer, summarizing the invention.",
  drawings_meta: "Each figure and the reference numerals it shows.",
  office_action: "Paste the examiner's Office action text here.",
};

/** Sections only relevant once later stages are reached; hidden by default in intake. */
export const ADVANCED_SECTION_KEYS: ReadonlySet<SectionKey> = new Set(["office_action"]);

export const ABSTRACT_WORD_LIMIT = 150;

/** Entity status for fee/certification purposes (37 CFR 1.27 / 1.29). */
export const ENTITY_STATUSES = ["large", "small", "micro"] as const;
export type EntityStatus = (typeof ENTITY_STATUSES)[number];
export const ENTITY_STATUS_LABELS: Record<EntityStatus, string> = {
  large: "Large entity",
  small: "Small entity (37 CFR 1.27)",
  micro: "Micro entity (37 CFR 1.29)",
};

export const PATENT_TYPES = ["utility", "design", "plant"] as const;
export type PatentType = (typeof PATENT_TYPES)[number];

export const PROJECT_STATUSES = [
  "drafting",
  "filed",
  "published",
  "office_action",
  "allowed",
  "granted",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PATENT_TYPE_LABELS: Record<PatentType, string> = {
  utility: "Utility",
  design: "Design",
  plant: "Plant",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  drafting: "Drafting",
  filed: "Filed",
  published: "Published",
  office_action: "Office action",
  allowed: "Allowed",
  granted: "Granted",
};

export function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/**
 * Word counts at which a section reads as substantively drafted. These are not the legal
 * length, just enough that a one-word stub does not count as a finished section. Used for
 * partial-credit progress so the dashboard number tracks real depth, not mere presence.
 */
export const SECTION_TARGET_WORDS: Partial<Record<SectionKey, number>> = {
  title: 3,
  cross_reference: 3,
  gov_interest: 3,
  background: 40,
  summary: 25,
  brief_description_drawings: 8,
  detailed_description: 80,
  claims: 20,
  abstract: 30,
  drawings_meta: 8,
};

/** Substantive draft progress (0..1) across the required spec sections, by depth not presence. */
export function specProgress(
  sectionWords: Partial<Record<SectionKey, number>>,
): number {
  const required = SECTION_KEYS.filter((k) => !ADVANCED_SECTION_KEYS.has(k));
  if (required.length === 0) return 0;
  let sum = 0;
  for (const k of required) {
    const target = SECTION_TARGET_WORDS[k] ?? 10;
    sum += Math.min((sectionWords[k] ?? 0) / target, 1);
  }
  return sum / required.length;
}

/**
 * How much of the whole filing is actually done (0..100). The drafted specification is the
 * bulk, weighted 0.7 and credited by depth rather than presence, and the three filing
 * prerequisites - a filled disclosure, at least one inventor, and a signed declaration -
 * each add 0.1. So typing one word in every box no longer reads as nearly complete.
 */
export function filingCompleteness(input: {
  sectionWords: Partial<Record<SectionKey, number>>;
  hasDisclosure: boolean;
  inventorCount: number;
  hasSignedDeclaration: boolean;
}): number {
  const spec = specProgress(input.sectionWords);
  const disclosure = input.hasDisclosure ? 1 : 0;
  const inventors = input.inventorCount > 0 ? 1 : 0;
  const signed = input.hasSignedDeclaration ? 1 : 0;
  const score = 0.7 * spec + 0.1 * disclosure + 0.1 * inventors + 0.1 * signed;
  return Math.round(score * 100);
}
