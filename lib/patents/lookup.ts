"use server";

/**
 * Load a found patent's own content (title, abstract, a representative figure, inventors)
 * from the public Google Patents page, so a similar-patent result can expand to show the
 * actual patent and its drawing in place. SERVER ONLY. Only the public patent number is
 * sent out, never the user's invention text. Rate limited per user.
 */
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";

export type PatentDetails = {
  number: string;
  title: string | null;
  abstract: string | null;
  figureUrl: string | null;
  inventors: string[];
  url: string;
};

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

export async function loadPatentDetails(
  patentNumber: string,
): Promise<{ ok: true; details: PatentDetails } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const rl = await checkRateLimit(supabase, "patent_lookup", 60, 3600);
  if (!rl.allowed) return { error: rl.retryMessage };

  const num = patentNumber.trim();
  if (!num) return { error: "No patent number." };
  const slug = num.replace(/[\s-]/g, "").toUpperCase();
  const url = `https://patents.google.com/patent/${slug}/en`;

  const blank: PatentDetails = {
    number: num,
    title: null,
    abstract: null,
    figureUrl: null,
    inventors: [],
    url,
  };

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Pincite/1.0)" },
    });
    if (!res.ok) return { ok: true, details: blank };
    const html = await res.text();

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
    const figureUrl =
      html.match(/https:\/\/patentimages\.storage\.googleapis\.com\/[^"']+\.png/i)?.[0] ??
      null;
    const inventors = [
      ...html.matchAll(/<meta name="DC\.contributor"[^>]+content="([^"]+)"/gi),
    ]
      .map((m) => decode(m[1]))
      .filter((n) => n && n.toLowerCase() !== "individual")
      .slice(0, 6);

    return {
      ok: true,
      details: { number: num, title, abstract, figureUrl, inventors, url },
    };
  } catch {
    return { ok: true, details: blank };
  }
}
