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
import {
  SECTION_LABELS,
  wordCount,
  type SectionKey,
} from "@/lib/projects/sections";
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

/** The occurrence of `needle` in `hay` closest to `near`, or -1. Used to apply a fix to the
 *  flagged span and not some other identical text elsewhere in the section. */
function nearestIndex(hay: string, needle: string, near: number): number {
  let idx = hay.indexOf(needle);
  if (idx < 0) return -1;
  let best = idx;
  let bestDist = Math.abs(idx - near);
  while ((idx = hay.indexOf(needle, idx + 1)) >= 0) {
    const d = Math.abs(idx - near);
    if (d < bestDist) {
      best = idx;
      bestDist = d;
    }
  }
  return best;
}

/**
 * Guided auto-fix (Feature 4), step 1: ask the model for the smallest edit that resolves ONE
 * flagged finding, returned as an exact {before, after} substring pair so the UI can show a
 * before/after diff. Nothing is changed here - the user accepts the edit (applyFix) or rejects
 * it. Synthetic/public text only until vendor ZDR is on. Rate-limited + budget-capped.
 */
export async function proposeFix(input: {
  projectId: string;
  sectionKey: string;
  spanStart: number;
  spanEnd: number;
  title: string;
  explanation: string;
  cfrRef: string | null;
}): Promise<
  { ok: true; before: string; after: string; note: string } | { error: string }
> {
  const { supabase } = await requireUser();
  const rl = await checkRateLimit(supabase, "grok_autofix", 30, 3600);
  if (!rl.allowed) return { error: rl.retryMessage };
  const budget = await checkGlobalLimit(supabase, "grok_global_day", 300, 86400);
  if (!budget.allowed)
    return { error: "The daily AI budget is used up. Please try again tomorrow." };

  const sections = await getSectionContent(input.projectId);
  const content = sections[input.sectionKey as SectionKey] ?? "";
  if (!content.trim()) return { error: "There is no text in this section to fix." };

  const s = Math.max(0, Math.min(content.length, input.spanStart));
  const e = Math.max(s, Math.min(content.length, input.spanEnd));
  // Mark the flagged span so the model fixes the right occurrence; markers are stripped after.
  const marked = `${content.slice(0, s)}⟦${content.slice(s, e)}⟧${content.slice(e)}`;
  const label = SECTION_LABELS[input.sectionKey as SectionKey] ?? input.sectionKey;

  const system =
    "You are a meticulous US patent drafting assistant. You fix exactly one flagged defect with the smallest possible edit and never change anything else.";
  const prompt = `A defect was flagged in the "${label}" section of a patent application.
Defect: ${input.title}. ${input.explanation}${input.cfrRef ? ` (${input.cfrRef})` : ""}
The flagged text is wrapped in ⟦ ⟧ markers in the section below. Fix ONLY that defect.

SECTION:
"""
${marked}
"""

Return ONLY a JSON object: {"before": "<exact contiguous substring of the ORIGINAL section to replace, copied verbatim, WITHOUT the markers>", "after": "<the corrected replacement>", "note": "<one short sentence describing the change>"}.
Rules:
- "before" must be an exact substring of the original section text (do not include the ⟦ ⟧ markers).
- Make the smallest change that fixes only this defect and copy everything else verbatim.
- Output JSON only, no commentary.`;

  let text: string;
  try {
    const r = await generateText({ system, prompt, temperature: 0, maxTokens: 700 });
    text = r.text;
  } catch (err) {
    return { error: `Model error: ${(err as Error).message}` };
  }
  const m = text.match(/\{[\s\S]*\}/);
  let raw: { before?: string; after?: string; note?: string } = {};
  try {
    raw = m ? JSON.parse(m[0]) : {};
  } catch {
    raw = {};
  }
  const before = String(raw.before ?? "").replace(/[⟦⟧]/g, "");
  const after = String(raw.after ?? "");
  const note = String(raw.note ?? "").slice(0, 200);
  if (!before || !content.includes(before)) {
    return {
      error: "Could not propose a precise fix. Use Take me to issue to edit it by hand.",
    };
  }
  if (before === after) return { error: "No change was proposed." };
  return { ok: true, before, after, note };
}

/**
 * Guided auto-fix, step 2: apply an accepted {before, after} edit to the section (replacing the
 * occurrence nearest the flagged span), save it, and recompute findings so the list updates.
 */
export async function applyFix(input: {
  projectId: string;
  sectionKey: string;
  before: string;
  after: string;
  spanStart: number;
}): Promise<{ ok: true } | { error: string }> {
  const { supabase, user } = await requireUser();
  const sections = await getSectionContent(input.projectId);
  const content = sections[input.sectionKey as SectionKey] ?? "";
  const idx = nearestIndex(content, input.before, input.spanStart);
  if (idx < 0) return { error: "The text has changed since the fix was proposed. Re-run it." };

  const next =
    content.slice(0, idx) + input.after + content.slice(idx + input.before.length);
  const now = new Date().toISOString();
  const { error } = await supabase.from("project_sections").upsert(
    {
      project_id: input.projectId,
      section_key: input.sectionKey,
      content: next,
      word_count: wordCount(next),
      updated_at: now,
    },
    { onConflict: "project_id,section_key" },
  );
  if (error) return { error: error.message };

  await logAudit(supabase, {
    userId: user.id,
    action: "section_edited",
    projectId: input.projectId,
    detail: { section: input.sectionKey, autofix: true },
  });
  await computeAndPersistFindings(supabase, input.projectId);
  revalidatePath(`/projects/${input.projectId}/review`);
  revalidatePath(`/projects/${input.projectId}`);
  return { ok: true };
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
- category: Step 1 - statutory category (process, machine, manufacture, composition of matter, or none).
- prong_one: Step 2A Prong One - does the claim recite a judicial exception (abstract idea, law of nature, natural phenomenon)? Which, if any?
- prong_two: Step 2A Prong Two - is any exception integrated into a practical application?
- step_2b: Step 2B - does the claim add significantly more than the exception?
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
