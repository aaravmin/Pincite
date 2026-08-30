/**
 * The §101 Alice/Mayo walkthrough (MPEP 2106), pure half. This is the one model-assisted
 * check in the review feature, and it is deliberately framed as a walkthrough rather than a
 * verdict: the prompt forbids an eligibility conclusion and the UI labels the result as the
 * model's read, to verify. Choosing the claim and reading the answer happen here, with no
 * I/O, so both are testable without a provider key.
 */
import type { ParsedClaim } from "@/features/review/domain/claims";
import type { EligibilityAnalysis } from "@/features/review/domain/finding";

/**
 * The claim to walk. Eligibility is argued on the broadest claim, so we take the first claim
 * that does not reference another claim; if every claim references one (a malformed set), we
 * fall back to the first rather than refusing to run.
 */
export function pickIndependentClaim(
  parsed: readonly ParsedClaim[],
): ParsedClaim | undefined {
  return parsed.find((c) => !/\bclaim\s+\d+\b/i.test(c.raw)) ?? parsed[0];
}

/** The neutral walkthrough prompt. Never asks for a verdict - only where the claim sits. */
export function buildEligibilityPrompt(claim: {
  number: number;
  raw: string;
}): { system: string; prompt: string } {
  const system =
    "You are a patent examiner aid applying the USPTO Alice/Mayo subject-matter eligibility framework (MPEP 2106). Do NOT decide whether the claim is eligible or ineligible. Walk the framework concisely and neutrally. Return ONLY a JSON object.";
  const prompt = `Claim ${claim.number}: ${claim.raw}

Return JSON with these string keys:
- category: Step 1 - statutory category (process, machine, manufacture, composition of matter, or none).
- prong_one: Step 2A Prong One - does the claim recite a judicial exception (abstract idea, law of nature, natural phenomenon)? Which, if any?
- prong_two: Step 2A Prong Two - is any exception integrated into a practical application?
- step_2b: Step 2B - does the claim add significantly more than the exception?
- summary: one neutral sentence on where the claim sits in the framework (not a verdict).`;
  return { system, prompt };
}

/**
 * Read the walkthrough out of the model's answer. Throws if the embedded JSON is malformed -
 * the caller reports that as a model error rather than showing an empty framework. A missing
 * key reads as "", and a missing summary falls back to the raw answer so the user still sees
 * what the model said.
 */
export function parseEligibilityResponse(text: string): EligibilityAnalysis {
  const json = text.match(/\{[\s\S]*\}/);
  const parsed = json ? JSON.parse(json[0]) : {};
  return {
    category: String(parsed.category ?? ""),
    prong_one: String(parsed.prong_one ?? ""),
    prong_two: String(parsed.prong_two ?? ""),
    step_2b: String(parsed.step_2b ?? ""),
    summary: String(parsed.summary ?? text.slice(0, 300)),
  };
}
