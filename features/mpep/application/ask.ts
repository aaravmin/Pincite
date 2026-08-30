import "server-only";

/**
 * The Ask flow: locate the responsive MPEP section for a question, load
 * its full text, pick the responsive passage to highlight, and report which requested
 * section numbers resolve to real corpus text vs are dropped (anti-hallucination spine).
 * Deterministic and corpus-only; a Grok-generated plain-English answer layers on next.
 */
import type { TypedSupabaseClient } from "@/shared/db/types";
import { checkRateLimit } from "@/shared/rate-limit/check";
import { extractSectionNumbers } from "@/features/mpep/domain/locate";
import {
  isPointerStub,
  selectResponsivePassage,
} from "@/features/mpep/domain/highlight";
import type { AskResult, MpepSection } from "@/features/mpep/domain/types";
import { loadSectionRow } from "@/features/mpep/infrastructure/corpus-repository";
import { locate } from "@/features/mpep/application/locate";
import { partitionCitations } from "@/features/mpep/application/validate-citations";

export async function askMpepQuestion(
  supabase: TypedSupabaseClient,
  query: string,
): Promise<AskResult | { error: string }> {
  const q = query.trim();

  const rl = await checkRateLimit(supabase, "mpep_ask", 60, 3600);
  if (!rl.allowed) return { error: rl.retryMessage };

  const requested = await partitionCitations(extractSectionNumbers(q));
  const candidates = await locate(supabase, q, 6);

  // For a free-text question, walk the ranked candidates and answer with the first one
  // that is actually substantive - skip the MPEP's pure cross-reference stubs ("See MPEP
  // Chapter 2300.") so the user lands on real text, not a pointer. When the user typed an
  // explicit section number, honor it verbatim (that's a deliberate lookup, not a search).
  const explicitLookup = requested.resolved.length > 0;
  let section: MpepSection | null = null;
  let chosenIdx = -1;
  for (let i = 0; i < candidates.length; i++) {
    const loaded = await loadSectionRow(supabase, candidates[i].section_number);
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
    section = await loadSectionRow(supabase, candidates[0].section_number);
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
