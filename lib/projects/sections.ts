/**
 * The structured-intake section model (roadmap §4.1). Section content is stored as a
 * raw plain-text string so character offsets stay stable for later finding/highlight
 * spans — see docs/style-guide.md.
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
  title: "Short technical title.",
  cross_reference: "Any provisional or parent application being claimed.",
  gov_interest: "Present, or state not applicable.",
  background: "Field of the invention and description of related art.",
  summary: "High-level statement of the invention.",
  brief_description_drawings: "One line per figure.",
  detailed_description: "The body, where reference numerals are introduced.",
  claims: "One numbered claim per block, each a single sentence.",
  abstract: "Single paragraph, 150 words max.",
  drawings_meta: "Figure list, and the reference numerals each figure shows.",
  office_action: "Paste the examiner's action text, when one has been received.",
};

/** Sections only relevant once later stages are reached; hidden by default in intake. */
export const ADVANCED_SECTION_KEYS: ReadonlySet<SectionKey> = new Set(["office_action"]);

export const ABSTRACT_WORD_LIMIT = 150;

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

/** Fraction of required sections with any content. Used for the dashboard card. */
export function completeness(sections: Partial<Record<SectionKey, string>>): number {
  const required = SECTION_KEYS.filter((k) => !ADVANCED_SECTION_KEYS.has(k));
  const filled = required.filter((k) => (sections[k] ?? "").trim().length > 0);
  return Math.round((filled.length / required.length) * 100);
}
