/**
 * Compatibility read-side loader, kept for the export report only (features/exports).
 *
 * The Review screen itself no longer uses this: it loads one page model through
 * features/review/application/get-review-page.ts, which reads sections from the request-cached
 * project snapshot and findings from features/review/infrastructure/findings-repository.ts.
 * This file goes away once the export pipeline reads its sections from the snapshot too.
 * RLS scopes both reads to the owner.
 */
import { createClient } from "@/shared/db/server";
import type { FindingRow } from "@/features/review/domain/finding";
import { loadFindings } from "@/features/review/infrastructure/findings-repository";

export type { FindingRow };

export async function getReview(
  projectId: string,
): Promise<{ sections: Record<string, string>; findings: FindingRow[] }> {
  const supabase = await createClient();
  const [sectionRows, findings] = await Promise.all([
    supabase
      .from("project_sections")
      .select("section_key, content")
      .eq("project_id", projectId),
    loadFindings(supabase, projectId),
  ]);

  const sections: Record<string, string> = {};
  for (const s of sectionRows.data ?? []) sections[s.section_key] = s.content ?? "";

  return { sections, findings };
}
