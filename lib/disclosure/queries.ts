import { createClient } from "@/lib/supabase/server";
import {
  DISCLOSURE_FIELDS,
  emptyDisclosure,
  type Disclosure,
} from "@/lib/disclosure/types";

export async function getDisclosure(projectId: string): Promise<Disclosure> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_disclosure")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw new Error(`load disclosure: ${error.message}`);
  const d = emptyDisclosure();
  if (data) {
    for (const f of DISCLOSURE_FIELDS) {
      d[f.key] = (data as Record<string, string>)[f.key] ?? "";
    }
  }
  return d;
}
