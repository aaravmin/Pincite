/** Read-side loaders for the filing domain. RLS scopes every query to the owner. */
import { createClient } from "@/lib/supabase/server";
import type { Inventor, Attachment, Declaration } from "@/lib/filing/types";

export async function getInventors(projectId: string): Promise<Inventor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_inventors")
    .select("*")
    .eq("project_id", projectId)
    .order("ord", { ascending: true });
  if (error) throw new Error(`load inventors: ${error.message}`);
  return (data as Inventor[]) ?? [];
}

export async function getAttachments(projectId: string): Promise<Attachment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_attachments")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`load attachments: ${error.message}`);
  return (data as Attachment[]) ?? [];
}

export async function getDeclarations(projectId: string): Promise<Declaration[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_declarations")
    .select("*")
    .eq("project_id", projectId)
    .order("signed_at", { ascending: true });
  if (error) throw new Error(`load declarations: ${error.message}`);
  return (data as Declaration[]) ?? [];
}
