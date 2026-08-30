import "server-only";

/**
 * Persistence for review findings. RLS scopes the `findings` table to the owner of the
 * project, so a read or write for a matter the viewer cannot see simply affects no rows.
 *
 * Findings are a derived, disposable projection of the current draft text - not history - so
 * a run REPLACES them wholesale rather than diffing. (The immutable record of what was found
 * lives in the audit log and in version snapshots.)
 */
import type { TypedSupabaseClient } from "@/shared/db/types";
import type { Finding, FindingRow } from "@/features/review/domain/finding";

const FINDING_COLUMNS =
  "id, section_key, span_start, span_end, severity, kind, actionable, title, explanation, mpep_section, cfr_ref";

/** The stored findings for one matter, violations before attention (the display order). */
export async function loadFindings(
  supabase: TypedSupabaseClient,
  projectId: string,
): Promise<FindingRow[]> {
  const { data } = await supabase
    .from("findings")
    .select(FINDING_COLUMNS)
    .eq("project_id", projectId)
    .order("severity", { ascending: true });
  return data ?? [];
}

/**
 * Swap the stored findings for a fresh run. An insert failure is deliberately not surfaced:
 * a failed write leaves the previous findings deleted and the screen shows an empty list,
 * which is the same "run it again" state the user would get from an error, and it keeps a
 * transient database hiccup from blocking the check.
 */
export async function replaceFindings(
  supabase: TypedSupabaseClient,
  projectId: string,
  findings: Finding[],
): Promise<void> {
  await supabase.from("findings").delete().eq("project_id", projectId);
  if (findings.length > 0) {
    await supabase
      .from("findings")
      .insert(findings.map((f) => ({ project_id: projectId, ...f })));
  }
}
