/**
 * Tier 2 validator: consistency checks that read within/across claims (roadmap §4.3).
 * Deterministic-parse heuristics, so they are flagged "attention" (verify), not hard
 * violations. Two checks now: means-plus-function invocation (35 U.S.C. 112(f); MPEP
 * 2181) and antecedent-basis gaps (35 U.S.C. 112(b); MPEP 2173.05(e)). Terminology
 * consistency, claim-to-spec support, and reference-numeral integrity are follow-ups
 * (they want model assist).
 */
import { parseClaims } from "@/lib/patent/claims";
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

function normTerm(phrase: string): string {
  const words = phrase.trim().toLowerCase().split(/\s+/);
  if (words.length === 2 && CONNECTORS.has(words[1])) return words[0];
  return words.join(" ");
}

function head(term: string): string {
  const parts = normTerm(term).split(/\s+/);
  return parts[parts.length - 1] ?? term;
}

export function runTier2(sections: Record<string, string>): Finding[] {
  const out: Finding[] = [];
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
    const end = start + c.raw.length;

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
        title: `Claim ${c.number} invokes means-plus-function ("${mpf[0].trim()}")`,
        explanation:
          "Under 35 U.S.C. 112(f), make sure the specification discloses the corresponding structure, or the limitation may be indefinite.",
        mpep_section: "2181",
        cfr_ref: "35 U.S.C. 112(f)",
      });
    }

    // (B) Antecedent basis (MPEP 2173.05(e)). Collect elements introduced with
    // "a"/"an" in this claim and any referenced parent claim, then check each
    // "the"/"said" reference resolves to one of them by head noun.
    const introducedHeads = new Set<string>();
    const collect = (text: string) => {
      for (const m of text.matchAll(/\b(?:a|an)\s+([a-z]+(?:\s+[a-z]+)?)\b/gi)) {
        introducedHeads.add(head(m[1].toLowerCase()));
      }
    };
    collect(c.raw);
    for (const m of c.raw.matchAll(/\bclaim\s+(\d+)\b/gi)) {
      const p = byNumber.get(Number(m[1]));
      if (p) collect(p.raw);
    }

    for (const m of c.raw.matchAll(/\b(?:the|said)\s+([a-z]+(?:\s+[a-z]+)?)\b/gi)) {
      const term = m[1].toLowerCase();
      const h = head(term);
      if (ANTECEDENT_STOP.has(h) || ANTECEDENT_STOP.has(term)) continue;
      if (introducedHeads.has(h)) continue;
      const idx = c.raw.toLowerCase().indexOf(m[0].toLowerCase());
      out.push({
        section_key: "claims",
        span_start: start + (idx >= 0 ? idx : 0),
        span_end: start + (idx >= 0 ? idx : 0) + m[0].length,
        severity: "attention",
        kind: "consistency",
        actionable: true,
        title: `Claim ${c.number}: "${m[0].trim()}" may lack antecedent basis`,
        explanation:
          'Introduce this element earlier with "a" or "an" before referring to it with "the" or "said", or it may be indefinite.',
        mpep_section: "2173.05(e)",
        cfr_ref: "35 U.S.C. 112(b)",
      });
    }
  }

  return out;
}
