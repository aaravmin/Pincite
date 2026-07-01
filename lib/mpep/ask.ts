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
import { selectResponsivePassage, isPointerStub } from "@/lib/mpep/highlight";
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

  // For a free-text question, walk the ranked candidates and answer with the first one
  // that is actually substantive - skip the MPEP's pure cross-reference stubs ("See MPEP
  // Chapter 2300.") so the user lands on real text, not a pointer. When the user typed an
  // explicit section number, honor it verbatim (that's a deliberate lookup, not a search).
  const explicitLookup = requested.resolved.length > 0;
  let section: Awaited<ReturnType<typeof loadSection>> = null;
  let chosenIdx = -1;
  for (let i = 0; i < candidates.length; i++) {
    const loaded = await loadSection(candidates[i].section_number);
    if (!loaded) continue;
    if (explicitLookup || !isPointerStub(loaded.full_text)) {
      section = loaded;
      chosenIdx = i;
      break;
    }
  }
  // Everything matched was a stub (rare): fall back to the top-ranked candidate so the
  // pane still resolves to real corpus text rather than going blank.
  if (!section && candidates[0]) {
    section = await loadSection(candidates[0].section_number);
    chosenIdx = 0;
  }
  const span = section ? selectResponsivePassage(section.full_text, q) : null;
  const alternatives = candidates
    .filter((_, i) => i !== chosenIdx)
    .slice(0, 4);

  return {
    query: q,
    section,
    span,
    alternatives,
    requested,
  };
}
