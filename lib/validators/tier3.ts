/**
 * Tier 3 validator (deterministic part): indefinite relative terms (roadmap §4.3; MPEP
 * 2173.05(b)). These are sometimes fine and sometimes fatal, so they are flagged
 * "attention" (verify), never a hard violation. The §101 Alice/Mayo walkthrough is the
 * model-assisted part and lives in lib/validators/run.ts (analyzeEligibility), labeled as
 * the model's read.
 */
import { parseClaims } from "@/lib/patent/claims";
import type { PatentType } from "@/lib/projects/sections";
import type { Finding } from "@/lib/validators/types";

// Classic relative / indefinite terms. Kept to clearly-relative adverbials to limit noise.
const RELATIVE = [
  "substantially",
  "approximately",
  "about",
  "essentially",
  "relatively",
  "generally",
  "sufficient",
  "effective amount",
];

export function runTier3(
  sections: Record<string, string>,
  patentType: PatentType = "utility",
): Finding[] {
  const out: Finding[] = [];
  if (patentType === "design") return out;
  const claimsText = sections["claims"] ?? "";
  if (!claimsText.trim()) return out;

  const claims = parseClaims(claimsText);
  const offsetOf = (raw: string, start: number) => {
    const i = claimsText.indexOf(raw, start >= 0 ? start : 0);
    return i >= 0 ? i : 0;
  };

  for (const c of claims) {
    const base = offsetOf(c.raw, c.start);
    for (const term of RELATIVE) {
      const re = new RegExp(`\\b${term.replace(/ /g, "\\s+")}\\b`, "i");
      const m = re.exec(c.raw);
      if (m && m.index >= 0) {
        out.push({
          section_key: "claims",
          span_start: base + m.index,
          span_end: base + m.index + m[0].length,
          severity: "attention",
          kind: "substantive",
          actionable: true,
          title: `Claim ${c.number} uses the relative term "${m[0]}"`,
          explanation:
            "Relative terms can be indefinite unless your draft provides a standard for measuring them. Verify the draft gives a standard, or use a definite term.",
          mpep_section: "2173.05(b)",
          cfr_ref: "35 U.S.C. 112(b)",
        });
      }
    }
  }
  return out;
}
