/**
 * Generation client. Grok (xAI) is primary, Gemini is fallback.
 *
 * SERVER ONLY — reads XAI_API_KEY / GEMINI_API_KEY. Never import into a client
 * component.
 *
 * CONFIDENTIALITY: any model that sees invention text inherits the Phase 0
 * zero-retention / US-region terms. Until those are confirmed for xAI and Google
 * (see docs/business-context.md), only synthetic patent text may be sent here.
 */

export type GenerateParams = {
  system?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  /** Use the cheaper Grok tier (GROK_FAST_MODEL) for non-core calls. */
  fast?: boolean;
};

export type GenerateResult = {
  text: string;
  provider: "grok" | "gemini";
  model: string;
};

const GROK_BASE = "https://api.x.ai/v1";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

async function generateWithGrok(
  params: GenerateParams,
  model: string,
): Promise<string> {
  const key = process.env.XAI_API_KEY;
  if (!key) throw new Error("XAI_API_KEY is not set");

  const res = await fetch(`${GROK_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(params.system
          ? [{ role: "system", content: params.system }]
          : []),
        { role: "user", content: params.prompt },
      ],
      temperature: params.temperature ?? 0,
      ...(params.maxTokens ? { max_tokens: params.maxTokens } : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`Grok ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

async function generateWithGemini(
  params: GenerateParams,
  model: string,
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");

  const res = await fetch(
    `${GEMINI_BASE}/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(params.system
          ? { systemInstruction: { parts: [{ text: params.system }] } }
          : {}),
        contents: [{ role: "user", parts: [{ text: params.prompt }] }],
        generationConfig: {
          temperature: params.temperature ?? 0,
          ...(params.maxTokens ? { maxOutputTokens: params.maxTokens } : {}),
        },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return (
    json.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("") ?? ""
  );
}

export async function generateText(
  params: GenerateParams,
): Promise<GenerateResult> {
  const provider = (process.env.GENERATION_PROVIDER ?? "grok").toLowerCase();
  const grokModel = params.fast
    ? (process.env.GROK_FAST_MODEL ?? process.env.GROK_MODEL ?? "grok-4.3")
    : (process.env.GROK_MODEL ?? "grok-4.3");
  const geminiModel = process.env.GEMINI_MODEL ?? "gemini-2.5-pro";

  if (provider === "gemini") {
    return {
      text: await generateWithGemini(params, geminiModel),
      provider: "gemini",
      model: geminiModel,
    };
  }

  try {
    return {
      text: await generateWithGrok(params, grokModel),
      provider: "grok",
      model: grokModel,
    };
  } catch (err) {
    if (process.env.GEMINI_API_KEY) {
      console.error(
        "[llm] Grok failed, falling back to Gemini:",
        (err as Error).message,
      );
      return {
        text: await generateWithGemini(params, geminiModel),
        provider: "gemini",
        model: geminiModel,
      };
    }
    throw err;
  }
}
