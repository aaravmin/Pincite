"use server";

/**
 * Run the validators on a project, persist findings, and audit (roadmap §4.3). Each
 * finding's MPEP pin is validated against the corpus before storage; an unresolved pin is
 * dropped (set null) rather than shown — the anti-hallucination spine. Latest run replaces
 * prior findings. Also exposes getRuleSection so the review UI can open a pinned rule in
 * the evidence pane.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { getSectionContent } from "@/lib/projects/queries";
import { runTier1 } from "@/lib/validators/tier1";
import { validateCitations } from "@/lib/mpep/citation";
import { loadSection, type MpepSection } from "@/lib/mpep/load";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function runValidators(
  projectId: string,
): Promise<{ ok: true; count: number; dropped: number } | { error: string }> {
  const { supabase, user } = await requireUser();
  const sections = await getSectionContent(projectId);
  const findings = runTier1(sections);

  // Validate MPEP pins against the corpus; drop any that don't resolve.
  const pins = findings
    .map((f) => f.mpep_section)
    .filter((p): p is string => !!p);
  const resolved = await validateCitations(pins);
  let dropped = 0;
  for (const f of findings) {
    if (f.mpep_section && !resolved.has(f.mpep_section)) {
      f.mpep_section = null;
      dropped++;
    }
  }

  await supabase.from("findings").delete().eq("project_id", projectId);
  if (findings.length > 0) {
    await supabase.from("findings").insert(
      findings.map((f) => ({ project_id: projectId, ...f })),
    );
  }

  await logAudit(supabase, {
    userId: user.id,
    action: "findings_run",
    projectId,
    detail: { count: findings.length, dropped },
  });
  revalidatePath(`/projects/${projectId}/review`);
  return { ok: true, count: findings.length, dropped };
}

export async function getRuleSection(
  sectionNumber: string,
): Promise<MpepSection | null> {
  await requireUser();
  return loadSection(sectionNumber);
}
