/**
 * The MPEP feature's shared shapes. Pure: these travel from the corpus repository through
 * the application layer into the evidence pane, so they must stay free of any db or
 * framework type.
 */

/** A full MPEP section as stored in the local versioned corpus. */
export type MpepSection = {
  section_number: string;
  title: string | null;
  chapter: string | null;
  revision_tag: string | null;
  edition: string;
  source_url: string;
  full_text: string;
};

/** A locate candidate - just enough to rank and offer it as an alternative. */
export type LocatedSection = {
  section_number: string;
  title: string | null;
};

export type AskResult = {
  query: string;
  section: MpepSection | null;
  span: { start: number; end: number } | null;
  alternatives: LocatedSection[];
  requested: { resolved: string[]; dropped: string[] };
};
