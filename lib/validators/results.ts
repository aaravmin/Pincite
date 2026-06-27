/** Read-side loader for the review page. RLS scopes to the owner. */
import { createClient } from "@/lib/supabase/server";

export type FindingRow = {
  id: string;
  section_key: string;
  span_start: number;
  span_end: number;
  severity: "violation" | "attention" | "pass";
  kind: string;
  actionable: boolean;
  title: string;
  explanation: string;
  mpep_section: string | null;
  cfr_ref: string | null;
};

export async function getReview(
  projectId: string,
): Promise<{ sections: Record<string, string>; findings: FindingRow[] }> {
  const supabase = await createClient();
  const { data: secs } = await supabase
    .from("project_sections")
    .select("section_key, content")
    .eq("project_id", projectId);
  const sections: Record<string, string> = {};
  for (const s of secs ?? []) sections[s.section_key] = s.content ?? "";

  const { data: findings } = await supabase
    .from("findings")
    .select(
      "id, section_key, span_start, span_end, severity, kind, actionable, title, explanation, mpep_section, cfr_ref",
    )
    .eq("project_id", projectId)
    .order("severity", { ascending: true });

  return { sections, findings: (findings as FindingRow[]) ?? [] };
}
