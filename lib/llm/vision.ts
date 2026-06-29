/**
 * Vision for patent drawings. SERVER ONLY. Uses Grok vision (the active vendor).
 * CONFIDENTIALITY: a figure sent here is seen by the vendor and ZDR is not confirmed on,
 * so use only public or synthetic figures until ZDR is on (docs/business-context.md).
 */
const GROK_BASE = "https://api.x.ai/v1";

async function grokVision(
  prompt: string,
  base64: string,
  mimeType: string,
  maxTokens: number,
): Promise<string> {
  const key = process.env.XAI_API_KEY;
  if (!key) throw new Error("No vision model key (XAI_API_KEY)");
  const model =
    process.env.GROK_VISION_MODEL ?? process.env.GROK_MODEL ?? "grok-4.3";
  const res = await fetch(`${GROK_BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: maxTokens,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
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

export type DrawingNumeral = { numeral: string; x: number; y: number };
export type DrawingVisionIssue = {
  title: string;
  detail: string;
  x: number | null;
  y: number | null;
};

/** Structured read of one figure: a description, the figure label, every reference numeral
 *  with its location, and any drawing problems the model can see. Coordinates are normalized
 *  0..1 from the top-left and are approximate (a vision estimate). */
export type DrawingVision = {
  summary: string;
  figureLabel: string | null;
  numerals: DrawingNumeral[];
  issues: DrawingVisionIssue[];
};

const ANALYZE_PROMPT = `You are a USPTO patent drawings examiner reviewing ONE figure for compliance defects under 37 CFR 1.84 and 1.83.
Return ONLY a JSON object (no prose, no markdown fences) with exactly these keys:
- "summary": one factual sentence describing what the figure shows.
- "figureLabel": the figure label visible in the drawing such as "FIG. 1", or null if none is present.
- "numerals": an array of every reference numeral you can read in the drawing, each {"numeral":"12","x":0.0,"y":0.0} where x,y is the approximate center of that numeral as a fraction (0..1) of image width and height from the TOP-LEFT.
- "issues": an array of drawing problems you can actually see, each {"title":"short label","detail":"one sentence","x":0.0 or null,"y":0.0 or null}. Give x,y when the problem is at a specific spot, and set BOTH to null when the problem applies to the whole figure. Look for both kinds:
  - located (give x,y): a reference numeral with no lead line to a part, a lead line with no numeral, a visible part that has no reference numeral, numerals that are illegible or overlapping.
  - whole-figure (x and y null): the figure is not a clean black-and-white line drawing (it is in color, or is a grayscale photo where line art is required); the background is not solid white; the lines are too light, broken, or poor quality; the drawing is too small or lacks an adequate scale; surfaces that need section or surface hatching are missing it; or the drawing appears cut off at the sheet margins.
Do NOT invent problems. Return an empty array if the figure looks compliant. Do not report a missing figure label as an issue; that is handled separately.
All coordinates use the top-left as origin. Output JSON only.`;

function clamp01(n: unknown): number | null {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : null;
}

export async function analyzeDrawingVision(
  base64: string,
  mimeType: string,
): Promise<DrawingVision> {
  const text = await grokVision(ANALYZE_PROMPT, base64, mimeType, 1400);
  const match = text.match(/\{[\s\S]*\}/);
  let raw: Record<string, unknown> = {};
  try {
    raw = match ? JSON.parse(match[0]) : {};
  } catch {
    raw = {};
  }

  const numerals: DrawingNumeral[] = Array.isArray(raw.numerals)
    ? (raw.numerals as Record<string, unknown>[])
        .map((r) => ({
          numeral: String(r.numeral ?? "").trim(),
          x: clamp01(r.x) ?? 0,
          y: clamp01(r.y) ?? 0,
        }))
        .filter((r) => r.numeral)
    : [];

  const issues: DrawingVisionIssue[] = Array.isArray(raw.issues)
    ? (raw.issues as Record<string, unknown>[])
        .map((r) => ({
          title: String(r.title ?? "").trim(),
          detail: String(r.detail ?? "").trim(),
          x: clamp01(r.x),
          y: clamp01(r.y),
        }))
        .filter((r) => r.title || r.detail)
    : [];

  return {
    summary: String(raw.summary ?? "").trim(),
    figureLabel:
      raw.figureLabel == null || raw.figureLabel === ""
        ? null
        : String(raw.figureLabel).trim(),
    numerals,
    issues,
  };
}
