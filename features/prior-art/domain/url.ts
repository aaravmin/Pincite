/**
 * Resolve a clickable web page for a prior-art match. Prefer the stored source URL (set
 * for BigQuery candidates); otherwise build a Google Patents URL from the patent number,
 * so a manually compared patent is still openable. Returns null when there is nothing
 * sensible to link to.
 */
export function patentUrl(
  patentNumber: string,
  sourceUrl?: string | null,
): string | null {
  if (sourceUrl && /^https?:\/\//i.test(sourceUrl)) return sourceUrl;
  const n = (patentNumber ?? "").replace(/[\s-]/g, "").toUpperCase();
  if (n.length < 4 || n === "CANDIDATE") return null;
  return `https://patents.google.com/patent/${encodeURIComponent(n)}/en`;
}
