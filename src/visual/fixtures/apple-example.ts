// The ONLY invention text the marketing site and the demo may show: the public
// Apple application US 2012/0024859 A1 (a molded fiber food container). Claims
// are verbatim public text; claim 4 refers to claim 6, which does not exist -
// the exact real finding the deterministic Tier 1 validator emits
// (features/review/domain/tier1.ts). No private text, no live model, no live database.

import type { Citation, VisualSpan } from "../types";

export const APPLE_META = {
  publicationNumber: "US 2012 0024859 A1",
  title: "Molded fiber food container",
  claimsCaption: "US 2012 0024859 A1  .  Claims",
} as const;

// Claims 1 to 4, public text. Claim 1 is truncated (verbatim prefix + ellipsis)
// before its "comprising:" clause, both for hero readability and to keep the
// shown text free of colons/semicolons (the output discipline covers all
// visible text, including the plain-text editor).
export const APPLE_HERO_CLAIMS =
  "1. A molded fiber container suitable for containing a food item …\n" +
  "2. The container of claim 1, wherein the base and the lid are integrally formed from a single piece of molded fiber connected by a hinge.\n" +
  "3. The container of claim 1, wherein the plurality of ridges are arranged substantially concentrically about a center of the base.\n" +
  "4. The container of claim 6, wherein the plurality of openings comprise a plurality of slots.";

/** Compute the highlight span for the first occurrence of `needle`. */
function spanOf(text: string, needle: string, signal: VisualSpan["signal"], flagId?: string): VisualSpan {
  const start = text.indexOf(needle);
  return { start, end: start < 0 ? 0 : start + needle.length, signal, flagId };
}

export const CLAIM6_FLAG_ID = "claim-6";

/** The red flag in the hero: "claim 6" inside claim 4. */
export const APPLE_HERO_SPANS: VisualSpan[] = [
  spanOf(APPLE_HERO_CLAIMS, "claim 6", "red", CLAIM6_FLAG_ID),
];

export type StaticFinding = {
  id: string;
  title: string;
  explanation: string;
  area: "Claims" | "Specification";
  citation: Citation;
};

// The exact Tier 1 finding text for the non-existent claim reference
// (features/review/domain/tier1.ts). The statute tier (35 U.S.C. 112(d)) is the
// governing law for dependent-claim form; the app persists the CFR + MPEP pins.
export const CLAIM6_FINDING: StaticFinding = {
  id: CLAIM6_FLAG_ID,
  title: "Claim 4 depends on claim 6, which does not exist",
  explanation:
    "There is no claim 6 in the application, so claim 4 has nothing to build on and its scope is left undefined.",
  area: "Claims",
  citation: {
    law: "35 U.S.C. 112(d)",
    cfr: "37 CFR 1.75(c)",
    mpep: "608.01(n)",
    guidance:
      "Point claim 4 back to a claim you actually wrote. It narrows the openings introduced in claim 1, so make it depend on claim 1.",
    // Verbatim first sentence of 37 CFR 1.75(c) as carried in MPEP 608.01(n)
    // (snapshotted from the corpus). Commas only, so it survives the sanitizer.
    excerpt:
      "One or more claims may be presented in dependent form, referring back to and further limiting another claim or claims in the same application.",
  },
};
