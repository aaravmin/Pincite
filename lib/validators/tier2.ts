/**
 * Tier 2 validator: consistency checks that read within/across claims (roadmap §4.3).
 * Deterministic-parse heuristics, so they are flagged "attention" (verify), not hard
 * violations. Two checks now: means-plus-function invocation (35 U.S.C. 112(f); MPEP
 * 2181) and antecedent-basis gaps (35 U.S.C. 112(b); MPEP 2173.05(e)). Terminology
 * consistency, claim-to-spec support, and reference-numeral integrity are follow-ups
 * (they want model assist).
 */
import { parseClaims } from "@/lib/patent/claims";
import type { PatentType } from "@/lib/projects/sections";
import type { Finding } from "@/lib/validators/types";

const NONCE = [
  "means", "module", "mechanism", "unit", "element", "component", "member",
  "assembly", "arrangement", "device",
];

// Heads that routinely follow "the"/"said" without being antecedent-basis problems.
const ANTECEDENT_STOP = new Set([
  "invention", "art", "same", "present", "claim", "claims", "group", "plurality",
  "embodiment", "embodiments", "figure", "figures", "drawing", "drawings",
  "following", "foregoing", "above", "below", "preceding", "first", "second",
  "third", "one", "ones", "other", "others", "method", "apparatus", "system",
]);

// Words that are not the referenced noun; if captured as a trailing word, drop them so
// "the device of" resolves to "device" rather than the preposition "of".
const CONNECTORS = new Set([
  "of", "for", "to", "with", "in", "on", "at", "and", "or", "that", "which",
  "wherein", "comprising", "comprises", "having", "including", "from", "by", "as",
  "said", "the", "a", "an", "further", "being",
]);

export function runTier2(
  sections: Record<string, string>,
  patentType: PatentType = "utility",
): Finding[] {
  const out: Finding[] = [];
  // Design claims are a single formal sentence with no elements - no antecedent/MPF check.
  if (patentType === "design") return out;
  const claimsText = sections["claims"] ?? "";
  if (!claimsText.trim()) return out;

  const claims = parseClaims(claimsText);
  const byNumber = new Map(claims.map((c) => [c.number, c]));
  const offsetOf = (raw: string, start: number) => {
    const i = claimsText.indexOf(raw, start >= 0 ? start : 0);
    return i >= 0 ? i : 0;
  };

  const nonceRe = new RegExp(`\\b(${NONCE.join("|")})\\s+for\\s+\\w+`, "i");

  for (const c of claims) {
    const start = offsetOf(c.raw, c.start);

    // (A) Means-plus-function / nonce-word invocation (MPEP 2181).
    const mpf = c.raw.match(nonceRe);
    if (mpf) {
      const idx = c.raw.toLowerCase().indexOf(mpf[0].toLowerCase());
      out.push({
        section_key: "claims",
        span_start: start + (idx >= 0 ? idx : 0),
        span_end: start + (idx >= 0 ? idx : 0) + mpf[0].length,
        severity: "attention",
        kind: "consistency",
        actionable: true,
        title: `Claim ${c.number} invokes means plus function "${mpf[0].trim()}"`,
        explanation:
          "Disclose the structure that performs it, or it may be indefinite.",
        mpep_section: "2181",
        cfr_ref: "35 U.S.C. 112(f)",
      });
    }

    // (B) Antecedent basis (MPEP 2173.05(e)). Collect the words introduced with "a"/"an"
    // in this claim and, transitively, every claim it depends on (a dependent claim
    // inherits its parent's elements). A "the"/"said" reference has antecedent basis if any
    // of its noun words was introduced, so a verb that trails a properly introduced noun
    // (e.g. "the lid rotates") is not mistaken for a missing element.
    const introduced = new Set<string>();
    const visited = new Set<number>();
    // Parent-claim text precedes this claim entirely, so a noun mentioned in a parent (even
    // bare) gives basis here.
    let priorText = "";
    const collect = (num: number, isParent: boolean) => {
      if (visited.has(num)) return;
      visited.add(num);
      const cl = byNumber.get(num);
      if (!cl) return;
      if (isParent) priorText += " " + cl.raw.toLowerCase();
      // Capture the whole noun phrase after "a"/"an" (up to a few words), so a multi-word
      // element like "a molded fiber container" introduces "container", not just "molded".
      // Over-capturing only adds words to the introduced set, which avoids false positives.
      for (const a of cl.raw.matchAll(/\b(?:a|an)\s+([a-z]+(?:\s+[a-z]+){0,3})\b/gi)) {
        for (const w of a[1].toLowerCase().split(/\s+/)) {
          if (!CONNECTORS.has(w)) introduced.add(w);
        }
      }
      for (const r of cl.raw.matchAll(/\bclaim\s+(\d+)\b/gi)) collect(Number(r[1]), true);
    };
    collect(c.number, false);

    for (const m of c.raw.matchAll(/\b(?:the|said)\s+([a-z]+(?:\s+[a-z]+)?)\b/gi)) {
      const words = m[1]
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => !CONNECTORS.has(w));
      if (words.length === 0) continue;
      const idx = c.raw.toLowerCase().indexOf(m[0].toLowerCase());
      // A noun has basis if it was introduced with "a"/"an", or it simply appeared earlier
      // (a parent claim, or this claim before the reference). The latter covers mass nouns
      // like "moisture" and any bare prior mention, which kept getting falsely flagged.
      const before = priorText + " " + c.raw.slice(0, idx >= 0 ? idx : 0).toLowerCase();
      const hasBasis = (w: string) =>
        introduced.has(w) || new RegExp(`\\b${w}\\b`).test(before);
      // Skip boilerplate ("the present invention", "the first ...") and anything with basis.
      if (words.some((w) => ANTECEDENT_STOP.has(w))) continue;
      if (words.some(hasBasis)) continue;
      out.push({
        section_key: "claims",
        span_start: start + (idx >= 0 ? idx : 0),
        span_end: start + (idx >= 0 ? idx : 0) + m[0].length,
        severity: "attention",
        kind: "consistency",
        actionable: true,
        title: `Claim ${c.number}: "${m[0].trim()}" may lack antecedent basis`,
        explanation:
          'Introduce it with "a"/"an" before "the"/"said".',
        mpep_section: "2173.05(e)",
        cfr_ref: "35 U.S.C. 112(b)",
      });
    }
  }

  return out;
}
