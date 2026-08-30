/**
 * Shared prior-art shapes. Pure: they cross from the discovery providers through the
 * application layer into the results UI, so they carry no db or provider type.
 */

/** A public patent discovered as a comparison candidate (BigQuery or the keyless search). */
export type Candidate = {
  publication_number: string;
  title: string | null;
  abstract: string | null;
  source_url: string;
};

/** One persisted place where a candidate's wording overlaps the user's claims. */
export type ResultSpan = {
  user_span_start: number;
  user_span_end: number;
  patent_span_text: string;
  overlap_type: "lexical" | "semantic" | "claim_limitation";
  element_confidence: number | null;
};

export type ResultMatch = {
  id: string;
  patent_number: string;
  title: string | null;
  source_url: string | null;
  overall_score: number | null;
  spans: ResultSpan[];
};

/** The read model behind the prior-art screen. */
export type PriorArtResults = {
  claims: string;
  matches: ResultMatch[];
};

/** A found patent's own public content, shown in place next to the overlaps. */
export type PatentDetails = {
  number: string;
  title: string | null;
  abstract: string | null;
  figureUrls: string[];
  inventors: string[];
  url: string;
};

/** A scored candidate ready to be written to prior_art_matches + match_spans. */
export type PersistableMatch = {
  patent_number: string;
  title: string | null;
  source: "google_patents" | "uspto_odp" | "patentsview";
  source_url: string | null;
  overall_score: number;
  spans: {
    userSpanStart: number;
    userSpanEnd: number;
    patentSpanText: string;
    overlapType: "lexical" | "semantic" | "claim_limitation";
    confidence: number;
  }[];
};
