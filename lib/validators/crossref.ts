/**
 * Cross-reference consistency checks: does what the inventor described in the plain-language
 * disclosure actually line up with the formal specification and claims? "Things that don't
 * line up" are flagged so the application is internally consistent (35 U.S.C. 112(a)
 * written description). Document-level, computed live; reuses the FilingFinding shape and
 * the corpus-validated pin discipline.
 */
import type { FilingFinding } from "@/lib/validators/filing";
import { resolveFilingPins } from "@/lib/validators/filing";
import type { Disclosure } from "@/lib/disclosure/types";

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "for", "with", "to", "in", "on", "at",
  "system", "device", "method", "apparatus", "assembly", "unit", "part", "parts",
  "component", "components", "element", "elements", "thing", "things", "etc",
]);

export function runCrossRefChecks(
  disclosure: Disclosure,
  sections: Record<string, string>,
): FilingFinding[] {
  const out: FilingFinding[] = [];
  const specText = [
    sections["claims"] ?? "",
    sections["detailed_description"] ?? "",
    sections["summary"] ?? "",
  ]
    .join("\n")
    .toLowerCase();

  // Components disclosed but not claimed or described.
  const components = disclosure.components
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);
  const missing: string[] = [];
  for (const comp of components) {
    const term = comp.toLowerCase().replace(/^(a|an|the)\s+/, "");
    const words = term.split(/\s+/).filter((w) => !STOPWORDS.has(w));
    const probe = words.length ? words[words.length - 1] : term;
    if (probe.length < 3) continue;
    if (specText && !specText.includes(probe) && !specText.includes(term)) {
      missing.push(comp);
    }
  }
  for (const comp of missing.slice(0, 8)) {
    out.push({
      severity: "attention",
      actionable: true,
      title: `Component "${comp}" from your disclosure is not claimed or described`,
      explanation:
        "Every component you disclose should appear in the detailed description and, where it is part of the invention, in the claims — otherwise the application and claims do not line up.",
      mpep_section: "2163",
      cfr_ref: "35 U.S.C. 112(a)",
    });
  }

  // Problem stated in the disclosure but the Background is empty.
  if (disclosure.problem_solved.trim() && !(sections["background"] ?? "").trim()) {
    out.push({
      severity: "attention",
      actionable: true,
      title: "Your problem statement is not reflected in the Background",
      explanation:
        "You described the problem in the disclosure, but the Background of the Invention is empty. Carry the problem into the specification.",
      mpep_section: "608.01(c)",
      cfr_ref: "37 CFR 1.77(b)",
    });
  }

  return out;
}

export async function resolveCrossRefPins(
  findings: FilingFinding[],
): Promise<FilingFinding[]> {
  return resolveFilingPins(findings);
}
