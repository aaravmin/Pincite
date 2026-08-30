/**
 * Pure locate helpers (roadmap §4.5 "locate"). The ranked corpus lookups themselves live in
 * the application/infrastructure layers; this module only reads text.
 */

/** Pull explicit MPEP section references out of free text (e.g. "MPEP 2111.03"). */
export function extractSectionNumbers(text: string): string[] {
  const matches = text.match(/\b\d{3,4}(?:\.\d+)?(?:\([a-z0-9]+\))?\b/gi) ?? [];
  return [...new Set(matches)].filter((m) => {
    const chapter = Number(m.match(/^\d+/)?.[0] ?? "0");
    return chapter >= 100 && chapter <= 2999;
  });
}
