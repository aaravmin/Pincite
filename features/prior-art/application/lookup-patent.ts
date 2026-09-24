import "server-only";

/**
 * Load a found patent's own content (title, abstract, a representative figure, inventors)
 * from the public Google Patents page, so a similar-patent result can expand to show the
 * actual patent and its drawing in place. SERVER ONLY. Only the public patent number is
 * sent out, never the user's invention text. Rate limited per user.
 */
import type { TypedSupabaseClient } from "@/shared/db/types";
import demoPatent from "@/shared/demo/canned/patent-US20060213916A1.json";
import { CASE_STUDY_COMPARISON } from "@/shared/demo/fixture/case-study";
import { isDemoMode } from "@/shared/demo/mode";
import { checkRateLimit } from "@/shared/rate-limit/check";
import { parsePatentPage } from "@/features/prior-art/domain/patent-page";
import type { PatentDetails } from "@/features/prior-art/domain/types";

/** The case study's compared patent, parsed from its public page once (demo mode). */
const DEMO_PATENT: PatentDetails = demoPatent;

export async function lookupPatent(
  supabase: TypedSupabaseClient,
  patentNumber: string,
): Promise<{ ok: true; details: PatentDetails } | { error: string }> {
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
    figureUrls: [],
    inventors: [],
    url,
  };

  // Demo mode: the captured page for the compared patent; any other number reads as blank.
  if (isDemoMode()) {
    return {
      ok: true,
      details: slug === CASE_STUDY_COMPARISON.patentNumber ? DEMO_PATENT : blank,
    };
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Pincite/1.0)" },
    });
    if (!res.ok) return { ok: true, details: blank };
    const html = await res.text();
    return { ok: true, details: parsePatentPage(html, { number: num, url }) };
  } catch {
    return { ok: true, details: blank };
  }
}
