import "server-only";

/**
 * The generation provider behind the §101 Alice/Mayo walkthrough (MPEP 2106). Temperature 0
 * so the same claim produces the same reading of the framework - this is a walkthrough the
 * user is expected to verify, and a walkthrough that changes between runs is not verifiable.
 */
import { generateText } from "@/shared/llm/generate";

const ELIGIBILITY_MAX_TOKENS = 700;

export async function analyzeEligibilityWithModel(input: {
  system: string;
  prompt: string;
}): Promise<string> {
  const { text } = await generateText({
    system: input.system,
    prompt: input.prompt,
    temperature: 0,
    maxTokens: ELIGIBILITY_MAX_TOKENS,
  });
  return text;
}
