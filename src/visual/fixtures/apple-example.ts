// The ONLY invention text the marketing site and the demo may show: the public
// Apple application US 2012/0024859 A1 (a molded fiber food container). Claims
// are verbatim public text; claim 4 refers to claim 6, which does not exist -
// the exact real finding the deterministic Tier 1 validator emits
// (lib/validators/tier1.ts). No private text, no live model, no live database.

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

// Full public claim set (1 to 5). Used where multiple findings are the point
// (the dashboard and the demo). Claim 5 uses "claims 1 and 2" (a multiple
// dependent claim joined with "and"), the second real finding.
export const APPLE_CLAIMS_FULL =
  "1. A molded fiber container suitable for containing a food item, comprising: a base, the base comprising a plurality of ridges integrated with an interior surface of the base, wherein when the food item is placed on at least some of the plurality of ridges, a gap is formed between the food item and the interior surface of the base, the gap assisting in thermally isolating the food item and allowing moisture expelled from the food item to be transported away from the food item; and a lid, the lid comprising a plurality of openings arranged in accordance with at least some of the plurality of ridges, and a moisture channeling feature integrally formed in the lid.\n" +
  "2. The container of claim 1, wherein the base and the lid are integrally formed from a single piece of molded fiber connected by a hinge.\n" +
  "3. The container of claim 1, wherein the plurality of ridges are arranged substantially concentrically about a center of the base.\n" +
  "4. The container of claim 6, wherein the plurality of openings comprise a plurality of slots.\n" +
  "5. The container of claims 1 and 2, wherein the base and the lid are shaped to nest with a second container.";

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

/** Both real red flags for the full claim set (dashboard / demo). */
export const APPLE_FULL_SPANS: VisualSpan[] = [
  spanOf(APPLE_CLAIMS_FULL, "claim 6", "red", CLAIM6_FLAG_ID),
  spanOf(APPLE_CLAIMS_FULL, "claims 1 and 2", "red", "multi-dependent"),
];

// Claims 1 to 5 with claim 4 corrected to reference an existing earlier claim
// (claim 3), so the ONLY finding shown is the multiple dependent claim - claim 5
// joins "claims 1 and 2" with "and" instead of "or" (35 U.S.C. 112(e)). Verbatim
// public claim text otherwise; claim 1 truncated before its colon like the hero set.
export const APPLE_MULTI_CLAIMS =
  "1. A molded fiber container suitable for containing a food item …\n" +
  "2. The container of claim 1, wherein the base and the lid are integrally formed from a single piece of molded fiber connected by a hinge.\n" +
  "3. The container of claim 1, wherein the plurality of ridges are arranged substantially concentrically about a center of the base.\n" +
  "4. The container of claim 3, wherein the plurality of openings comprise a plurality of slots.\n" +
  "5. The container of claims 1 and 2, wherein the base and the lid are shaped to nest with a second container.";

/** The single red flag for the multiple dependent claim finding. */
export const APPLE_MULTI_SPANS: VisualSpan[] = [
  spanOf(APPLE_MULTI_CLAIMS, "claims 1 and 2", "red", "multi-dependent"),
];

export type StaticFinding = {
  id: string;
  title: string;
  explanation: string;
  area: "Claims" | "Specification";
  citation: Citation;
};

// The exact Tier 1 finding text for the non-existent claim reference
// (lib/validators/tier1.ts). The statute tier (35 U.S.C. 112(d)) is the
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

// The second real finding, used where multiple findings are shown.
export const MULTI_DEPENDENT_FINDING: StaticFinding = {
  id: "multi-dependent",
  title: "Claim 5 is a multiple dependent claim joined by and",
  explanation: "Refer to the earlier claims in the alternative, using or.",
  area: "Claims",
  citation: {
    law: "35 U.S.C. 112(e)",
    cfr: "37 CFR 1.75(c)",
    mpep: "608.01(n)",
    guidance:
      "A claim that depends on more than one earlier claim has to list them in the alternative with or, not with and.",
    excerpt:
      "A claim in multiple dependent form shall contain a reference, in the alternative only, to more than one claim previously set forth.",
  },
};
