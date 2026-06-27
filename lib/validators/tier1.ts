/**
 * Tier 1 validator: deterministic structural/format checks (roadmap §4.3). No model —
 * each result is true or not and carries a hard MPEP/CFR pin. Honors the actionable vs
 * informational split: fee items are informational (actionable: false), never a field to
 * "do". span_* are character offsets into the relevant section's content.
 */
import { wordCount } from "@/lib/projects/sections";
import { parseClaims } from "@/lib/patent/claims";
import type { Finding } from "@/lib/validators/types";

const TITLE_MAX = 500;
const ABSTRACT_MAX_WORDS = 150;

export function runTier1(sections: Record<string, string>): Finding[] {
  const out: Finding[] = [];
  const get = (k: string) => sections[k] ?? "";

  // Title length (37 CFR 1.72(a); MPEP 606)
  const title = get("title");
  if (title.length > TITLE_MAX) {
    out.push({
      section_key: "title",
      span_start: 0,
      span_end: title.length,
      severity: "violation",
      kind: "structural",
      actionable: true,
      title: `Title is ${title.length} characters (limit 500)`,
      explanation: "Shorten the title of the invention to 500 characters or fewer.",
      mpep_section: "606",
      cfr_ref: "37 CFR 1.72(a)",
    });
  }

  // Abstract (37 CFR 1.72(b); MPEP 608.01(b))
  const abstract = get("abstract");
  if (abstract.trim()) {
    const w = wordCount(abstract);
    if (w > ABSTRACT_MAX_WORDS) {
      out.push({
        section_key: "abstract",
        span_start: 0,
        span_end: abstract.length,
        severity: "violation",
        kind: "structural",
        actionable: true,
        title: `Abstract is ${w} words (limit 150)`,
        explanation: "Reduce the abstract to 150 words or fewer.",
        mpep_section: "608.01(b)",
        cfr_ref: "37 CFR 1.72(b)",
      });
    }
    const means = abstract.search(/\bmeans\b/i);
    if (means >= 0) {
      out.push({
        section_key: "abstract",
        span_start: means,
        span_end: means + 5,
        severity: "attention",
        kind: "structural",
        actionable: true,
        title: 'Abstract uses "means"',
        explanation:
          'Avoid claim-style or legal phrasing such as "means" in the abstract.',
        mpep_section: "608.01(b)",
        cfr_ref: "37 CFR 1.72(b)",
      });
    }
    if (/\n\s*\n/.test(abstract.trim())) {
      out.push({
        section_key: "abstract",
        span_start: 0,
        span_end: abstract.length,
        severity: "attention",
        kind: "structural",
        actionable: true,
        title: "Abstract is more than one paragraph",
        explanation: "The abstract should be a single paragraph.",
        mpep_section: "608.01(b)",
        cfr_ref: "37 CFR 1.72(b)",
      });
    }
  }

  // Claims
  const claimsText = get("claims");
  if (claimsText.trim()) {
    const claims = parseClaims(claimsText);
    const offsetOf = (raw: string, start: number) => {
      const i = claimsText.indexOf(raw, start >= 0 ? start : 0);
      return i >= 0 ? i : 0;
    };

    // Consecutive Arabic numbering (37 CFR 1.126)
    const consecutive = claims.every((c, i) => c.number === i + 1);
    if (!consecutive && claims.length > 0) {
      out.push({
        section_key: "claims",
        span_start: 0,
        span_end: Math.min(claimsText.length, 40),
        severity: "violation",
        kind: "structural",
        actionable: true,
        title: "Claims are not numbered consecutively",
        explanation: "Number claims consecutively in Arabic numerals starting at 1.",
        mpep_section: "608.01(m)",
        cfr_ref: "37 CFR 1.126",
      });
    }

    let independent = 0;
    for (const c of claims) {
      const start = offsetOf(c.raw, c.start);
      const end = start + c.raw.length;
      const trimmed = c.raw.trim();

      // Single sentence (37 CFR 1.75; MPEP 608.01(m))
      const endsWithPeriod = /\.\s*$/.test(trimmed);
      const midSentence = /\.\s+[A-Z]/.test(trimmed.replace(/\.\s*$/, ""));
      if (!endsWithPeriod || midSentence) {
        out.push({
          section_key: "claims",
          span_start: start,
          span_end: end,
          severity: "violation",
          kind: "structural",
          actionable: true,
          title: `Claim ${c.number} is not a single sentence`,
          explanation: "Each claim must be a single sentence ending in one period.",
          mpep_section: "608.01(m)",
          cfr_ref: "37 CFR 1.75",
        });
      }

      // Transitional phrase (MPEP 2111.03)
      if (!c.transition) {
        out.push({
          section_key: "claims",
          span_start: start,
          span_end: end,
          severity: "attention",
          kind: "structural",
          actionable: true,
          title: `Claim ${c.number} has no recognized transitional phrase`,
          explanation:
            'Use a transitional phrase such as "comprising", "consisting of", or "consisting essentially of".',
          mpep_section: "2111.03",
          cfr_ref: null,
        });
      }

      // Dependency analysis
      const refs = [
        ...c.raw.matchAll(/\bclaims?\s+(\d+)(?:\s*(?:-|to|or|and|,)\s*(\d+))?/gi),
      ];
      const isMultiple = refs.some((m) => m[2] || /\bclaims\b/i.test(m[0]));
      if (refs.length === 0) independent++;

      if (isMultiple) {
        out.push({
          section_key: "claims",
          span_start: start,
          span_end: end,
          severity: "attention",
          kind: "structural",
          actionable: false,
          title: `Claim ${c.number} is a multiple dependent claim (fee applies)`,
          explanation:
            "A multiple dependent claim incurs the fee under 37 CFR 1.16(j), paid to the USPTO, not entered here.",
          mpep_section: "608.01(n)",
          cfr_ref: "37 CFR 1.16(j)",
        });
      }

      for (const m of refs) {
        if (Number(m[1]) >= c.number) {
          out.push({
            section_key: "claims",
            span_start: start,
            span_end: end,
            severity: "violation",
            kind: "structural",
            actionable: true,
            title: `Claim ${c.number} refers to claim ${m[1]}, which does not precede it`,
            explanation: "A dependent claim must refer to a preceding claim.",
            mpep_section: "608.01(n)",
            cfr_ref: "37 CFR 1.75(c)",
          });
          break;
        }
      }
    }

    // Claim-count fees — informational (37 CFR 1.16(h)/(i))
    if (claims.length > 20) {
      out.push({
        section_key: "claims",
        span_start: 0,
        span_end: Math.min(claimsText.length, 40),
        severity: "attention",
        kind: "structural",
        actionable: false,
        title: `${claims.length} total claims (over 20; fee applies)`,
        explanation:
          "Excess-claim fees under 37 CFR 1.16(i) apply above 20 total claims, paid to the USPTO.",
        mpep_section: "608.01(m)",
        cfr_ref: "37 CFR 1.16(i)",
      });
    }
    if (independent > 3) {
      out.push({
        section_key: "claims",
        span_start: 0,
        span_end: Math.min(claimsText.length, 40),
        severity: "attention",
        kind: "structural",
        actionable: false,
        title: `${independent} independent claims (over 3; fee applies)`,
        explanation:
          "Excess independent-claim fees under 37 CFR 1.16(h) apply above 3, paid to the USPTO.",
        mpep_section: "608.01(m)",
        cfr_ref: "37 CFR 1.16(h)",
      });
    }
  }

  return out;
}
