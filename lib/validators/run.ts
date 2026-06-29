"use server";

/**
 * Run the validators on a project, persist findings, and audit (roadmap §4.3). Each
 * finding's MPEP pin is validated against the corpus before storage; an unresolved pin is
 * dropped (set null) rather than shown. analyzeEligibility is the model-assisted §101
 * Alice/Mayo walkthrough (MPEP 2106), returned for display and labeled as the model's read.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { getSectionContent, getProject } from "@/lib/projects/queries";
import { runTier1 } from "@/lib/validators/tier1";
import { runTier2 } from "@/lib/validators/tier2";
import { runTier3 } from "@/lib/validators/tier3";
import { validateCitations } from "@/lib/mpep/citation";
import { loadSection, type MpepSection } from "@/lib/mpep/load";
import { parseClaims } from "@/lib/patent/claims";
import { generateText } from "@/lib/llm/generate";
import { checkRateLimit, checkGlobalLimit } from "@/lib/ratelimit";
import type { EligibilityAnalysis, Finding } from "@/lib/validators/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/**
 * Re-run the deterministic validators (tiers 1-3) over the project's current saved text,
 * validate each MPEP pin against the corpus (dropping unresolved ones), and replace the
 * stored findings. Returns the freshly computed findings so callers can report on them.
 * Deterministic and cheap (no model call), so it is safe to run on every recheck.
 */
async function computeAndPersistFindings(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  projectId: string,
): Promise<{ findings: Finding[]; dropped: number }> {
  const [sections, project] = await Promise.all([
    getSectionContent(projectId),
    getProject(projectId),
  ]);
  const patentType = project?.patent_type ?? "utility";
  const findings = [
    ...runTier1(sections, patentType),
    ...runTier2(sections, patentType),
    ...runTier3(sections, patentType),
  ];

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
  return { findings, dropped };
}

export async function runValidators(
  projectId: string,
): Promise<{ ok: true; count: number; dropped: number } | { error: string }> {
  const { supabase, user } = await requireUser();
  const { findings, dropped } = await computeAndPersistFindings(supabase, projectId);

  await logAudit(supabase, {
    userId: user.id,
    action: "findings_run",
    projectId,
    detail: { count: findings.length, dropped },
  });
  revalidatePath(`/projects/${projectId}/review`);
  return { ok: true, count: findings.length, dropped };
}

/**
 * Re-check a single issue the user believes they fixed. Re-runs the validators over the
 * current text and reports whether an issue with the same section and title still appears.
 * Also refreshes the stored findings so the list reflects the latest state.
 */
export async function recheckFinding(
  projectId: string,
  sectionKey: string,
  title: string,
): Promise<{ ok: true; fixed: boolean; total: number } | { error: string }> {
  const { supabase, user } = await requireUser();
  const { findings } = await computeAndPersistFindings(supabase, projectId);
  const stillPresent = findings.some(
    (f) => f.section_key === sectionKey && f.title === title,
  );
  await logAudit(supabase, {
    userId: user.id,
    action: "findings_run",
    projectId,
    detail: { kind: "recheck", section: sectionKey, fixed: !stillPresent },
  });
  revalidatePath(`/projects/${projectId}/review`);
  return { ok: true, fixed: !stillPresent, total: findings.length };
}

export async function getRuleSection(
  sectionNumber: string,
): Promise<MpepSection | null> {
  await requireUser();
  return loadSection(sectionNumber);
}

export async function analyzeEligibility(projectId: string): Promise<
  | {
      ok: true;
      claimNumber: number;
      claimText: string;
      analysis: EligibilityAnalysis;
      mpep: string | null;
    }
  | { error: string }
> {
  const { supabase, user } = await requireUser();
  const claims = (await getSectionContent(projectId))["claims"] ?? "";
  if (!claims.trim()) return { error: "Add claims to the project first." };

  const parsed = parseClaims(claims);
  const indep = parsed.find((c) => !/\bclaim\s+\d+\b/i.test(c.raw)) ?? parsed[0];
  if (!indep) return { error: "No claim found." };

  const rl = await checkRateLimit(supabase, "eligibility", 30, 3600);
  if (!rl.allowed) return { error: rl.retryMessage };
  const budget = await checkGlobalLimit(supabase, "grok_global_day", 300, 86400);
  if (!budget.allowed)
    return { error: "The daily AI budget for the §101 walkthrough is used up. Please try again tomorrow." };

  const system =
    "You are a patent examiner aid applying the USPTO Alice/Mayo subject-matter eligibility framework (MPEP 2106). Do NOT decide whether the claim is eligible or ineligible. Walk the framework concisely and neutrally. Return ONLY a JSON object.";
  const prompt = `Claim ${indep.number}: ${indep.raw}

Return JSON with these string keys:
- category: Step 1 — statutory category (process, machine, manufacture, composition of matter, or none).
- prong_one: Step 2A Prong One — does the claim recite a judicial exception (abstract idea, law of nature, natural phenomenon)? Which, if any?
- prong_two: Step 2A Prong Two — is any exception integrated into a practical application?
- step_2b: Step 2B — does the claim add significantly more than the exception?
- summary: one neutral sentence on where the claim sits in the framework (not a verdict).`;

  let analysis: EligibilityAnalysis;
  try {
    const { text } = await generateText({
      system,
      prompt,
      temperature: 0,
      maxTokens: 700,
    });
    const json = text.match(/\{[\s\S]*\}/);
    const parsedJson = json ? JSON.parse(json[0]) : {};
    analysis = {
      category: String(parsedJson.category ?? ""),
      prong_one: String(parsedJson.prong_one ?? ""),
      prong_two: String(parsedJson.prong_two ?? ""),
      step_2b: String(parsedJson.step_2b ?? ""),
      summary: String(parsedJson.summary ?? text.slice(0, 300)),
    };
  } catch (e) {
    return { error: `Model error: ${(e as Error).message}` };
  }

  const mpep = (await validateCitations(["2106"])).has("2106") ? "2106" : null;
  await logAudit(supabase, {
    userId: user.id,
    action: "findings_run",
    projectId,
    detail: { kind: "eligibility", claim: indep.number },
  });

  return { ok: true, claimNumber: indep.number, claimText: indep.raw, analysis, mpep };
}
