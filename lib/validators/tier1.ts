/**
 * Tier 1 validator: deterministic structural/format checks (roadmap §4.3). No model -
 * each result is true or not and carries a hard MPEP/CFR pin. Honors the actionable vs
 * informational split: fee items are informational (actionable: false), never a field to
 * "do". span_* are character offsets into the relevant section's content. Patent-type
 * aware: utility runs the full claim-structure suite (37 CFR 1.75); design runs the
 * single-claim rules (37 CFR 1.153).
 */
import { wordCount, type PatentType } from "@/lib/projects/sections";
import { parseClaims } from "@/lib/patent/claims";
import type { Finding } from "@/lib/validators/types";

const TITLE_MAX = 500;
const ABSTRACT_MAX_WORDS = 150;

/** Claim numbers referenced by a claim, and whether it is a (proper) multiple dependent. */
function analyzeRefs(raw: string): {
  refNums: number[];
  multiple: boolean;
  alternative: boolean;
} {
  const refNums: number[] = [];
  let multiple = false;
  let alternative = false;
  for (const m of raw.matchAll(
    /\bclaims?\s+(\d+)(?:\s*(-|to|through|or|and|,)\s*(\d+))?/gi,
  )) {
    refNums.push(Number(m[1]));
    if (m[3]) {
      refNums.push(Number(m[3]));
      multiple = true;
      if (/or/i.test(m[2] ?? "")) alternative = true;
    }
  }
  if (/\bany\s+one\s+of\s+claims\b/i.test(raw)) {
    multiple = true;
    alternative = true;
  }
  return { refNums: [...new Set(refNums)], multiple, alternative };
}

export function runTier1(
  sections: Record<string, string>,
  patentType: PatentType = "utility",
): Finding[] {
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
      explanation: "Shorten to 500 characters or fewer.",
      mpep_section: "606",
      cfr_ref: "37 CFR 1.72(a)",
    });
  }

  // Abstract (37 CFR 1.72(b); MPEP 608.01(b)) - design applications have no abstract.
  const abstract = get("abstract");
  if (patentType !== "design" && abstract.trim()) {
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
        explanation: "Cut to 150 words or fewer.",
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
        explanation: 'Avoid claim-style language in the abstract.',
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
        explanation: "Use a single paragraph.",
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

    if (patentType === "design") {
      // Design: exactly one claim, in the prescribed form (37 CFR 1.153; MPEP 1503.03).
      if (claims.length > 1) {
        out.push({
          section_key: "claims",
          span_start: 0,
          span_end: Math.min(claimsText.length, 60),
          severity: "violation",
          kind: "structural",
          actionable: true,
          title: `A design application must have exactly one claim (found ${claims.length})`,
          explanation: "A design application allows only one claim.",
          mpep_section: "1503.03",
          cfr_ref: "37 CFR 1.153",
        });
      }
      const only = claims[0];
      if (only) {
        const start = offsetOf(only.raw, only.start);
        const end = start + only.raw.length;
        const wellFormed =
          /the\s+ornamental\s+design\s+for\s+.+\s+as\s+shown(\s+and\s+described)?/i.test(
            only.raw,
          );
        if (!wellFormed) {
          out.push({
            section_key: "claims",
            span_start: start,
            span_end: end,
            severity: "violation",
            kind: "structural",
            actionable: true,
            title: "Design claim is not in the required form",
            explanation:
              'Must read "The ornamental design for [article] as shown".',
            mpep_section: "1503.03",
            cfr_ref: "37 CFR 1.153",
          });
        }
        const am = only.raw.match(/ornamental\s+design\s+for\s+(.+?)\s+as\s+shown/i);
        const article = am?.[1]?.trim().toLowerCase();
        const t = title.trim().toLowerCase();
        if (
          article &&
          t &&
          !t.includes(article) &&
          !article.includes(t)
        ) {
          out.push({
            section_key: "claims",
            span_start: start,
            span_end: end,
            severity: "attention",
            kind: "consistency",
            actionable: true,
            title: "Design claim article does not match the title",
            explanation: "Name the same article as the title.",
            mpep_section: "1503.03",
            cfr_ref: "37 CFR 1.153",
          });
        }
      }
      return out;
    }

    // ---- Utility claims (37 CFR 1.75) ----
    const claimNumbers = new Set(claims.map((c) => c.number));
    const analyses = claims.map((c) => ({ c, ...analyzeRefs(c.raw) }));
    const multipleSet = new Set(
      analyses.filter((a) => a.multiple).map((a) => a.c.number),
    );

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
        explanation: "Number consecutively from 1.",
        mpep_section: "608.01(m)",
        cfr_ref: "37 CFR 1.126",
      });
    }

    let independent = 0;
    analyses.forEach(({ c, refNums, multiple, alternative }, i) => {
      const start = offsetOf(c.raw, c.start);
      const end = start + c.raw.length;
      const trimmed = c.raw.trim();
      const dependent = refNums.length > 0;
      if (!dependent) independent++;

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
          explanation: "One sentence ending in one period.",
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
          explanation: 'Add a transitional phrase such as "comprising".',
          mpep_section: "2111.03",
          cfr_ref: null,
        });
      }

      // Claim 1 should be independent (least restrictive first) - 37 CFR 1.75(g)
      if (i === 0 && dependent) {
        out.push({
          section_key: "claims",
          span_start: start,
          span_end: end,
          severity: "attention",
          kind: "structural",
          actionable: true,
          title: "Claim 1 is a dependent claim",
          explanation: "Claim 1 should be independent.",
          mpep_section: "608.01(m)",
          cfr_ref: "37 CFR 1.75(g)",
        });
      }

      // Dependency validity (37 CFR 1.75(c))
      for (const n of refNums) {
        if (!claimNumbers.has(n)) {
          out.push({
            section_key: "claims",
            span_start: start,
            span_end: end,
            severity: "violation",
            kind: "structural",
            actionable: true,
            title: `Claim ${c.number} refers to claim ${n}, which does not exist`,
            explanation: "Refer to an existing, earlier claim.",
            mpep_section: "608.01(n)",
            cfr_ref: "37 CFR 1.75(c)",
          });
        } else if (n >= c.number) {
          out.push({
            section_key: "claims",
            span_start: start,
            span_end: end,
            severity: "violation",
            kind: "structural",
            actionable: true,
            title: `Claim ${c.number} refers to claim ${n}, which does not precede it`,
            explanation: "Refer to a lower-numbered claim.",
            mpep_section: "608.01(n)",
            cfr_ref: "37 CFR 1.75(c)",
          });
        }
      }

      // Multiple dependent claim rules (37 CFR 1.75(c); MPEP 608.01(n))
      if (multiple) {
        out.push({
          section_key: "claims",
          span_start: start,
          span_end: end,
          severity: "attention",
          kind: "structural",
          actionable: false,
          title: `Claim ${c.number} is a multiple dependent claim (fee applies)`,
          explanation: "Incurs a fee under 37 CFR 1.16(j).",
          mpep_section: "608.01(n)",
          cfr_ref: "37 CFR 1.16(j)",
        });
        if (!alternative) {
          out.push({
            section_key: "claims",
            span_start: start,
            span_end: end,
            severity: "violation",
            kind: "structural",
            actionable: true,
            title: `Claim ${c.number} multiple dependent claim must be in the alternative`,
            explanation:
              'Refer to the claims in the alternative ("1 or 2"), not with "and".',
            mpep_section: "608.01(n)",
            cfr_ref: "37 CFR 1.75(c)",
          });
        }
        if (refNums.some((n) => multipleSet.has(n))) {
          out.push({
            section_key: "claims",
            span_start: start,
            span_end: end,
            severity: "violation",
            kind: "structural",
            actionable: true,
            title: `Claim ${c.number} depends on another multiple dependent claim`,
            explanation: "A multiple dependent claim can't depend on another.",
            mpep_section: "608.01(n)",
            cfr_ref: "37 CFR 1.75(c)",
          });
        }
      }
    });

    // Claim-count fees - informational (37 CFR 1.16(h)/(i))
    if (claims.length > 20) {
      out.push({
        section_key: "claims",
        span_start: 0,
        span_end: Math.min(claimsText.length, 40),
        severity: "attention",
        kind: "structural",
        actionable: false,
        title: `${claims.length} total claims (over 20; fee applies)`,
        explanation: "Excess-claim fees apply above 20 total claims.",
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
        explanation: "Excess fees apply above 3 independent claims.",
        mpep_section: "608.01(m)",
        cfr_ref: "37 CFR 1.16(h)",
      });
    }
  }

  return out;
}
