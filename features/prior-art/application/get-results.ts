import "server-only";

/** Read-side loader for the prior-art results view. RLS scopes to the owner. */
import { createClient } from "@/shared/db/server";
import {
  loadClaimsText,
  loadMatches,
} from "@/features/prior-art/infrastructure/matches-repository";
import type { PriorArtResults } from "@/features/prior-art/domain/types";

export async function getPriorArtResults(
  projectId: string,
): Promise<PriorArtResults> {
  const supabase = await createClient();
  const [claims, matches] = await Promise.all([
    loadClaimsText(supabase, projectId),
    loadMatches(supabase, projectId),
  ]);
  return { claims, matches };
}
