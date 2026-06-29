"use server";

/**
 * The Ask flow (roadmap §5): locate the responsive MPEP section for a question, load
 * its full text, pick the responsive passage to highlight, and report which requested
 * section numbers resolve to real corpus text vs are dropped (anti-hallucination spine).
 * Deterministic and corpus-only; a Grok-generated plain-English answer layers on next.
 */
import { createClient } from "@/lib/supabase/server";
import { locate, extractSectionNumbers } from "@/lib/mpep/locate";
import { loadSection } from "@/lib/mpep/load";
import { partitionCitations } from "@/lib/mpep/citation";
import { selectResponsivePassage } from "@/lib/mpep/highlight";
import { checkRateLimit } from "@/lib/ratelimit";
import type { AskResult } from "@/lib/mpep/types";

export async function askMpep(
  query: string,
): Promise<AskResult | { error: string }> {
  const q = query?.trim();
  if (!q) return { error: "Enter a question or an MPEP section number." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const rl = await checkRateLimit(supabase, "mpep_ask", 60, 3600);
  if (!rl.allowed) return { error: rl.retryMessage };

  const requested = await partitionCitations(extractSectionNumbers(q));
  const candidates = await locate(q, 6);
  const top = candidates[0] ?? null;
  const section = top ? await loadSection(top.section_number) : null;
  const span = section ? selectResponsivePassage(section.full_text, q) : null;

  return {
    query: q,
    section,
    span,
    alternatives: candidates.slice(1, 5),
    requested,
  };
}
