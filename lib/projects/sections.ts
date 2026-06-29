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
  title:
    "A short, specific technical name for the invention - what it is, not a brand name. Example: 'Adjustable mount for a display arm'.",
  cross_reference:
    "If this builds on an earlier filing you are claiming priority to (a provisional or a parent application), name it and its number. Otherwise write 'Not applicable'.",
  gov_interest:
    "If the invention was made with US government funding, name the agency and contract number. Most people write 'Not applicable'.",
  background:
    "Describe the field and the problem, what existing solutions do, and why they fall short. Set up the need your invention fills, without arguing that it is patentable.",
  summary:
    "A plain, high-level description of what the invention is and does, in a few sentences. It previews the detailed description.",
  brief_description_drawings:
    "One short line per figure, e.g. 'FIG. 1 is a perspective view of the container.' Upload your figures on the Drawings step first, then describe each one here.",
  detailed_description:
    "The full, enabling description: how to make and use the invention, step by step, introducing each part with a reference numeral (e.g. base 10, arm 12) that matches the drawings.",
  claims:
    "The legal definition of what you are protecting. One numbered claim per block, each a single sentence. Claim 1 stands alone; a dependent claim refers back to an earlier claim and adds to it. Draft these after your disclosure and detailed description so they are supported.",
  abstract:
    "A single paragraph, 150 words or fewer, summarizing the invention so a reader grasps it quickly. Easiest to write last, once the rest is drafted.",
  drawings_meta:
    "List each figure and the reference numerals it shows, so the drawings, description, and claims stay consistent. Needs your drawings and detailed description in place.",
  office_action:
    "Only once the USPTO has examined the application and sent an Office action: paste the examiner's text here so Pincite can help you respond.",
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

/** Fraction of required sections with any content. Used for the dashboard card. */
export function completeness(sections: Partial<Record<SectionKey, string>>): number {
  const required = SECTION_KEYS.filter((k) => !ADVANCED_SECTION_KEYS.has(k));
  const filled = required.filter((k) => (sections[k] ?? "").trim().length > 0);
  return Math.round((filled.length / required.length) * 100);
}
