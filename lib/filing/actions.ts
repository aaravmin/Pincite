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
import { describeDrawing } from "@/lib/llm/vision";
import { checkRateLimit } from "@/lib/ratelimit";
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

/**
 * Describe an uploaded figure with a vision model, then check that each disclosed
 * component appears in it (37 CFR 1.83 requires every claimed feature to be shown in the
 * drawings). Public or synthetic figures only until vendor ZDR is on.
 */
export async function analyzeDrawing(input: {
  projectId: string;
  attachmentId: string;
}): Promise<
  | { ok: true; description: string; components: { name: string; shown: boolean }[] }
  | { error: string }
> {
  const { supabase, user } = await requireUser();

  const { data: att } = await supabase
    .from("project_attachments")
    .select("storage_path, mime")
    .eq("id", input.attachmentId)
    .eq("project_id", input.projectId)
    .maybeSingle();
  if (!att) return { error: "Attachment not found." };
  if (!att.mime.startsWith("image/")) {
    return { error: "Only image figures can be described." };
  }

  const rl = await checkRateLimit(supabase, "drawing_vision", 30, 3600);
  if (!rl.allowed) return { error: rl.retryMessage };

  const { data: blob, error: dlErr } = await createAdminClient()
    .storage.from("project-files")
    .download(att.storage_path);
  if (dlErr || !blob) {
    return { error: dlErr?.message ?? "Could not read the file." };
  }
  const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");

  let description: string;
  try {
    description = await describeDrawing(base64, att.mime);
  } catch (e) {
    return { error: `Vision model error: ${(e as Error).message}` };
  }
  if (!description) return { error: "The vision model returned nothing for this figure." };

  const { data: disc } = await supabase
    .from("project_disclosure")
    .select("components")
    .eq("project_id", input.projectId)
    .maybeSingle();
  const lower = description.toLowerCase();
  const components = ((disc?.components as string) ?? "")
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3)
    .map((name) => {
      const term = name.toLowerCase().replace(/^(a|an|the)\s+/, "");
      const words = term.split(/\s+/);
      const probe = words[words.length - 1];
      const shown =
        probe.length >= 3 && (lower.includes(probe) || lower.includes(term));
      return { name, shown };
    });

  await logAudit(supabase, {
    userId: user.id,
    action: "drawing_analyzed",
    projectId: input.projectId,
    detail: { attachmentId: input.attachmentId },
  });
  return { ok: true, description, components };
}
