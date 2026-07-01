/**
 * Invention disclosure - the plain-language technical intake a practitioner collects
 * before drafting (separate from the formal 1.77 specification). These answers feed the
 * specification, the duty of disclosure (37 CFR 1.56), and the cross-reference checks.
 */
export const DISCLOSURE_FIELDS = [
  {
    key: "field_industry",
    label: "Technical field / industry",
    hint: "The field or industry it operates in.",
  },
  {
    key: "problem_solved",
    label: "Problem solved",
    hint: "The problem it solves, and why existing solutions fall short.",
  },
  {
    key: "how_it_works",
    label: "How it works",
    hint: "The mechanism, process, or method it uses.",
  },
  {
    key: "components",
    label: "Key components",
    hint: "Key parts or elements, one per line.",
  },
  {
    key: "advantages",
    label: "Advantages",
    hint: "Measurable advantages over existing solutions.",
  },
  {
    key: "alternatives",
    label: "Alternatives & variations",
    hint: "Alternative embodiments, materials, or configurations.",
  },
  {
    key: "known_prior_art",
    label: "Known prior solutions",
    hint: "Products, patents, or papers you already know of.",
  },
] as const;

export type DisclosureKey = (typeof DISCLOSURE_FIELDS)[number]["key"];
export type Disclosure = Record<DisclosureKey, string>;

export function emptyDisclosure(): Disclosure {
  return {
    field_industry: "",
    problem_solved: "",
    how_it_works: "",
    components: "",
    advantages: "",
    alternatives: "",
    known_prior_art: "",
  };
}
