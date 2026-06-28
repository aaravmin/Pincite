/**
 * Vision for patent drawings. SERVER ONLY. Prefers Gemini multimodal when GEMINI_API_KEY
 * is set, otherwise falls back to Grok vision. CONFIDENTIALITY: a figure sent here is seen
 * by the vendor and neither vendor's ZDR is confirmed on, so use only public or synthetic
 * figures until ZDR is on (docs/business-context.md).
 */
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GROK_BASE = "https://api.x.ai/v1";

const PROMPT =
  "You are reviewing a patent figure. Describe in plain words what the drawing shows: the article, its visible parts and components, and any reference numerals or labels. Be concise and factual, and do not speculate beyond what is visible.";

export async function describeDrawing(
  base64: string,
  mimeType: string,
): Promise<string> {
  // Grok vision is the active path. Gemini is kept available for if a key is added.
  if (process.env.VISION_PROVIDER === "gemini" && process.env.GEMINI_API_KEY) {
    return describeWithGemini(base64, mimeType);
  }
  return describeWithGrok(base64, mimeType);
}

async function describeWithGemini(
  base64: string,
  mimeType: string,
): Promise<string> {
  const key = process.env.GEMINI_API_KEY!;
  const model =
    process.env.GEMINI_VISION_MODEL ??
    process.env.GEMINI_MODEL ??
    "gemini-2.5-pro";
  const res = await fetch(
    `${GEMINI_BASE}/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: PROMPT },
              { inlineData: { mimeType, data: base64 } },
            ],
          },
        ],
        generationConfig: { temperature: 0, maxOutputTokens: 500 },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini vision ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return (
    json.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("") ?? ""
  ).trim();
}

async function describeWithGrok(
  base64: string,
  mimeType: string,
): Promise<string> {
  const key = process.env.XAI_API_KEY;
  if (!key) throw new Error("No vision model key (GEMINI_API_KEY or XAI_API_KEY)");
  const model =
    process.env.GROK_VISION_MODEL ?? process.env.GROK_MODEL ?? "grok-4.3";
  const res = await fetch(`${GROK_BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Grok vision ${res.status}: ${await res.text()}`);
  if (res.headers.get("x-zero-data-retention") !== "true") {
    console.warn("[vision] Grok ZDR is not active — use public or synthetic figures only");
  }
  const json = await res.json();
  return (json.choices?.[0]?.message?.content ?? "").trim();
}
