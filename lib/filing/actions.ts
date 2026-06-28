"use server";

/**
 * Filing-domain mutations: inventors (ADS), applicant/entity, and attachment deletes.
 * Each enforces auth (RLS is the real boundary) and records an audit row. Attachment
 * UPLOADS go through the route handler app/api/projects/[id]/attachments (multipart).
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { ENTITY_STATUSES, type EntityStatus } from "@/lib/projects/sections";
import type { InventorInput, DeclarationStatements } from "@/lib/filing/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function saveInventors(input: {
  projectId: string;
  inventors: InventorInput[];
}): Promise<{ ok: true } | { error: string }> {
  const { supabase, user } = await requireUser();
  const clean = input.inventors
    .map((i) => ({
      legal_name: i.legal_name?.trim() ?? "",
      residence: i.residence?.trim() ?? "",
      mailing_address: i.mailing_address?.trim() ?? "",
      citizenship: i.citizenship?.trim() ?? "",
    }))
    .filter(
      (i) =>
        i.legal_name || i.residence || i.mailing_address || i.citizenship,
    );

  // Replace-all: delete the existing set, insert the new ordered rows.
  const { error: delErr } = await supabase
    .from("project_inventors")
    .delete()
    .eq("project_id", input.projectId);
  if (delErr) return { error: delErr.message };

  if (clean.length > 0) {
    const rows = clean.map((i, idx) => ({
      ...i,
      project_id: input.projectId,
      ord: idx,
    }));
    const { error: insErr } = await supabase
      .from("project_inventors")
      .insert(rows);
    if (insErr) return { error: insErr.message };
  }

  await logAudit(supabase, {
    userId: user.id,
    action: "inventors_saved",
    projectId: input.projectId,
    detail: { count: clean.length },
  });
  revalidatePath(`/projects/${input.projectId}/inventors`);
  return { ok: true };
}

export async function saveApplicant(input: {
  projectId: string;
  applicantName: string;
  applicantIsInventor: boolean;
  applicantIsJuristic: boolean;
  entityStatus: EntityStatus;
}): Promise<{ ok: true } | { error: string }> {
  const { supabase, user } = await requireUser();
  const entity = ENTITY_STATUSES.includes(input.entityStatus)
    ? input.entityStatus
    : "large";
  const { error } = await supabase
    .from("projects")
    .update({
      applicant_name: input.applicantName?.trim() || null,
      applicant_is_inventor: input.applicantIsInventor,
      applicant_is_juristic: input.applicantIsJuristic,
      entity_status: entity,
    })
    .eq("id", input.projectId);
  if (error) return { error: error.message };

  await logAudit(supabase, {
    userId: user.id,
    action: "applicant_saved",
    projectId: input.projectId,
    detail: { entity_status: entity, juristic: input.applicantIsJuristic },
  });
  revalidatePath(`/projects/${input.projectId}/inventors`);
  return { ok: true };
}

export async function deleteAttachment(input: {
  projectId: string;
  attachmentId: string;
}): Promise<{ ok: true } | { error: string }> {
  const { supabase, user } = await requireUser();
  const { data: row } = await supabase
    .from("project_attachments")
    .select("storage_path")
    .eq("id", input.attachmentId)
    .eq("project_id", input.projectId)
    .maybeSingle();
  if (!row) return { error: "Attachment not found." };

  // Ownership confirmed via the user client above; remove bytes with the admin client.
  await createAdminClient().storage
    .from("project-files")
    .remove([row.storage_path]);
  const { error } = await supabase
    .from("project_attachments")
    .delete()
    .eq("id", input.attachmentId);
  if (error) return { error: error.message };

  await logAudit(supabase, {
    userId: user.id,
    action: "attachment_deleted",
    projectId: input.projectId,
  });
  revalidatePath(`/projects/${input.projectId}/uploads`);
  return { ok: true };
}

export async function signDeclaration(input: {
  projectId: string;
  inventorId: string;
  legalName: string;
  statements: DeclarationStatements;
}): Promise<{ ok: true } | { error: string }> {
  const { supabase, user } = await requireUser();
  const legalName = input.legalName?.trim();
  if (!legalName) {
    return { error: "Enter the inventor's full legal name to sign." };
  }

  // Append-only: each signing inserts a new immutable declaration row.
  const { error } = await supabase.from("project_declarations").insert({
    project_id: input.projectId,
    inventor_id: input.inventorId,
    legal_name: legalName,
    statements: input.statements,
  });
  if (error) return { error: error.message };

  await logAudit(supabase, {
    userId: user.id,
    action: "declaration_signed",
    projectId: input.projectId,
    detail: { inventor_id: input.inventorId },
  });
  revalidatePath(`/projects/${input.projectId}/sign`);
  return { ok: true };
}
