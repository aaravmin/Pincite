/**
 * Stage detection (roadmap §4.2): a transparent rules engine over which sections are
 * filled plus the user's declared status. It returns the stage, the signals that produced
 * it (so the user can always see why), and what is missing to advance. Not a black box.
 */
import {
  SECTION_LABELS,
  type PatentType,
  type ProjectStatus,
  type SectionKey,
} from "@/lib/projects/sections";

export type StageInput = {
  filled: string[]; // section_keys with content
  declared_status: ProjectStatus;
  application_number: string | null;
  filing_date: string | null;
  patent_type: PatentType;
};

export type StageResult = { label: string; signals: string[]; missing: string[] };

const REQUIRED_UTILITY: SectionKey[] = [
  "title",
  "background",
  "summary",
  "detailed_description",
  "claims",
  "abstract",
];
// Design (37 CFR 1.154): figure descriptions + the single claim; drawings are the disclosure.
const REQUIRED_DESIGN: SectionKey[] = [
  "title",
  "brief_description_drawings",
  "claims",
];

export function detectStage(input: StageInput): StageResult {
  const f = new Set(input.filled);
  const has = (k: string) => f.has(k);
  const REQUIRED =
    input.patent_type === "design" ? REQUIRED_DESIGN : REQUIRED_UTILITY;
  const missingRequired = REQUIRED.filter((k) => !has(k));
  const labelList = (ks: SectionKey[]) => ks.map((k) => `Add the ${SECTION_LABELS[k]}.`);

  // Declared status drives the post-drafting lifecycle.
  switch (input.declared_status) {
    case "granted":
      return {
        label: "Granted — maintenance",
        signals: ["You marked this granted."],
        missing: [
          "Maintenance fees fall due at 3.5, 7.5, and 11.5 years (paid to the USPTO).",
        ],
      };
    case "allowed":
      return {
        label: "Allowed — issue",
        signals: ["You marked a notice of allowance."],
        missing: ["Pay the issue fee to the USPTO to let the patent grant."],
      };
    case "office_action":
      return {
        label: "Office action response",
        signals: ["You marked an office action received."],
        missing: [
          "A shortened statutory period (commonly three months) runs from the action; calendar it.",
        ],
      };
    case "published":
      return {
        label: "Published",
        signals: ["You marked this published (or 18 months have elapsed)."],
        missing: [],
      };
    case "filed":
      return {
        label: "Filed — awaiting examination",
        signals: [
          "You marked this filed.",
          input.application_number
            ? `Application number ${input.application_number}.`
            : "No application number entered.",
          input.filing_date
            ? `Filing date ${input.filing_date}.`
            : "No filing date entered.",
        ],
        missing: [
          ...(!input.application_number ? ["Enter the application number."] : []),
          ...(!input.filing_date ? ["Enter the filing date."] : []),
          "Examination timing is controlled by the USPTO.",
        ],
      };
  }

  // Drafting: infer from content.
  if (f.size === 0) {
    return {
      label: "Getting started",
      signals: ["No sections filled in yet."],
      missing: [
        "Start with the title and background, then the detailed description and claims.",
      ],
    };
  }
  if (input.patent_type === "design") {
    return missingRequired.length === 0
      ? {
          label: "Pre-filing review",
          signals: ["Title, figure descriptions, and the single claim are present."],
          missing: [
            "Upload the drawings (they are the disclosure), run the issue check, then consider filing.",
          ],
        }
      : {
          label: "Design drafting",
          signals: ["Design application; some required parts remain."],
          missing: labelList(missingRequired),
        };
  }
  if (missingRequired.length === 0) {
    return {
      label: "Pre-filing review",
      signals: ["All required parts are present."],
      missing: [
        "Run the issue check and a prior-art search, then consider whether you are ready to file.",
      ],
    };
  }
  if (has("claims")) {
    return {
      label: "Claims drafting",
      signals: ["Claims are present; some required parts remain."],
      missing: labelList(missingRequired),
    };
  }
  const specCore =
    has("title") && has("detailed_description") && (has("background") || has("summary"));
  if (specCore) {
    return {
      label: "Description drafting",
      signals: ["The description sections are present; no claims yet."],
      missing: labelList(missingRequired),
    };
  }
  return {
    label: "Drafting",
    signals: ["Some sections started."],
    missing: labelList(missingRequired),
  };
}
