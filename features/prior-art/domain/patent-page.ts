/**
 * Pure parsing of a public Google Patents page into the details we display next to a
 * match (title, abstract, the patent's own figure sheets, inventors). Kept separate from
 * the fetch so the extraction rules are unit-testable without the network.
 */
import type { PatentDetails } from "@/features/prior-art/domain/types";

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?34;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function parsePatentPage(
  html: string,
  base: { number: string; url: string },
): PatentDetails {
  const meta = (name: string): string | null => {
    const m = html.match(
      new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, "i"),
    );
    return m ? decode(m[1]) : null;
  };

  const titleTag = (html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "")
    .replace(/\s*-\s*Google Patents\s*$/i, "")
    .replace(/^[A-Z]{2}[A-Z0-9]+\s*-\s*/i, "");
  const title = meta("DC.title") || decode(titleTag) || null;
  const abstract = meta("description") || meta("DC.description");
  // Every figure sheet (named ...-D0000N.png). Each figure appears as both a thumbnail
  // and a full-res hash, so dedupe by the figure number, then order by it, so the found
  // patent's full set of views can be flipped through.
  const seenFig = new Set<string>();
  let figureUrls: string[] = [];
  for (const m of html.matchAll(
    /https:\/\/patentimages\.storage\.googleapis\.com\/[^"']+-D(\d+)\.png/gi,
  )) {
    if (seenFig.has(m[1])) continue;
    seenFig.add(m[1]);
    figureUrls.push(m[0]);
  }
  figureUrls.sort(
    (a, b) =>
      Number(a.match(/-D(\d+)\.png/i)?.[1] ?? 0) -
      Number(b.match(/-D(\d+)\.png/i)?.[1] ?? 0),
  );
  if (figureUrls.length === 0) {
    const one = html.match(
      /https:\/\/patentimages\.storage\.googleapis\.com\/[^"']+\.png/i,
    )?.[0];
    if (one) figureUrls = [one];
  }
  const inventors = [
    ...html.matchAll(/<meta name="DC\.contributor"[^>]+content="([^"]+)"/gi),
  ]
    .map((m) => decode(m[1]))
    .filter((n) => n && n.toLowerCase() !== "individual")
    .slice(0, 6);

  return {
    number: base.number,
    title,
    abstract,
    figureUrls,
    inventors,
    url: base.url,
  };
}
