import "server-only";

/**
 * The generation provider behind the guided auto-fix. Temperature 0 because a fix is a
 * correction, not a draft - the same defect should produce the same edit - and the token cap
 * keeps a single-defect edit from turning into a rewritten section.
 */
import { generateText } from "@/shared/llm/generate";

const FIX_MAX_TOKENS = 700;

export async function proposeFixWithModel(input: {
  system: string;
  prompt: string;
}): Promise<string> {
  const { text } = await generateText({
    system: input.system,
    prompt: input.prompt,
    temperature: 0,
    maxTokens: FIX_MAX_TOKENS,
  });
  return text;
}
