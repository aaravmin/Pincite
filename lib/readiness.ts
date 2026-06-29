/**
 * Per-matter readiness: one assembled snapshot of where an application stands and what to do
 * next. Reuses the same building blocks as the individual screens (stage detection, the
 * deterministic validators, the filing and cross-reference checks, the completeness score) so
 * the overview never disagrees with the detail screens. Read-only; RLS scopes every query.
 */
import { createClient } from "@/lib/supabase/server";
import { getProject, getSectionContent } from "@/lib/projects/queries";
import { getInventors, getDeclarations, getAttachments } from "@/lib/filing/queries";
import { getDisclosure } from "@/lib/disclosure/queries";
import { detectStage } from "@/lib/stage/detect";
import { runTier1 } from "@/lib/validators/tier1";
import { runTier2 } from "@/lib/validators/tier2";
import { runTier3 } from "@/lib/validators/tier3";
import { runFilingChecks } from "@/lib/validators/filing";
import { runCrossRefChecks } from "@/lib/validators/crossref";
import {
  SECTION_KEYS,
  ADVANCED_SECTION_KEYS,
  filingCompleteness,
  wordCount,
  type SectionKey,
} from "@/lib/projects/sections";
import type { Project } from "@/lib/projects/types";
import type { UserRole } from "@/lib/profile";

export type GateStatus = "done" | "violation" | "attention" | "todo";
export type Gate = {
  key: string;
  label: string;
  status: GateStatus;
  detail: string;
  href: string;
};
export type Readiness = {
  project: Project;
  stage: { label: string; signals: string[]; missing: string[] };
  completeness: number;
  gates: Gate[];
  next: { label: string; href: string } | null;
};

export async function getReadiness(
  projectId: string,
  role: UserRole | null,
): Promise<Readiness | null> {
  const project = await getProject(projectId);
  if (!project) return null;
  const supabase = await createClient();

  const [sections, inventors, declarations, attachments, disclosure] =
    await Promise.all([
      getSectionContent(projectId),
      getInventors(projectId),
      getDeclarations(projectId),
      getAttachments(projectId),
      getDisclosure(projectId),
    ]);
  const [priorArtRes, exportsRes] = await Promise.all([
    supabase.from("prior_art_matches").select("id").eq("project_id", projectId),
    supabase.from("exports").select("id").eq("project_id", projectId).limit(1),
  ]);
  const priorArtCount = (priorArtRes.data ?? []).length;

  const base = `/projects/${projectId}`;
  const pt = project.patent_type;

  // Stage and completeness.
  const filledKeys = SECTION_KEYS.filter(
    (k) => !ADVANCED_SECTION_KEYS.has(k) && (sections[k] ?? "").trim().length > 0,
  );
  const stage = detectStage({
    filled: filledKeys,
    declared_status: project.declared_status,
    application_number: project.application_number,
    filing_date: project.filing_date,
    patent_type: pt,
  });
  const sectionWords: Partial<Record<SectionKey, number>> = {};
  for (const k of SECTION_KEYS) sectionWords[k] = wordCount(sections[k] ?? "");
  const hasDisclosure = !!(
    disclosure.problem_solved?.trim() || disclosure.how_it_works?.trim()
  );
  const completeness = filingCompleteness({
    sectionWords,
    hasDisclosure,
    inventorCount: inventors.length,
    signedCount: declarations.length,
  });

  // Live deterministic checks so the counts are current without a prior manual run.
  const findings = [
    ...runTier1(sections, pt),
    ...runTier2(sections, pt),
    ...runTier3(sections, pt),
  ];
  const toFix = findings.filter((f) => f.severity === "violation").length;
  const toCheck = findings.filter((f) => f.severity === "attention").length;
  const filing = runFilingChecks({
    project,
    inventors,
    declarations,
    role,
    title: sections["title"] ?? "",
  });
  const filingFix = filing.filter((f) => f.severity === "violation").length;
  const consistency = runCrossRefChecks(disclosure, sections).length;

  // Per-step completion, mirroring the step rail.
  const required = SECTION_KEYS.filter((k) => !ADVANCED_SECTION_KEYS.has(k));
  const draftDone =
    required.length > 0 &&
    required.every((k) => (sections[k] ?? "").trim().length > 0);
  const disclosureDone = !!(
    disclosure.problem_solved?.trim() &&
    disclosure.how_it_works?.trim() &&
    disclosure.components?.trim()
  );
  const inventorsDone =
    inventors.length > 0 &&
    inventors.every(
      (i) => i.legal_name.trim() && i.residence.trim() && i.mailing_address.trim(),
    );
  const signedIds = new Set(declarations.map((d) => d.inventor_id));
  const signDone = inventors.length > 0 && inventors.every((i) => signedIds.has(i.id));

  const g = (
    key: string,
    label: string,
    status: GateStatus,
    detail: string,
    href: string,
  ): Gate => ({ key, label, status, detail, href });

  const gates: Gate[] = [
    g(
      "draft",
      "Draft",
      draftDone ? "done" : "todo",
      draftDone ? "All required sections written" : `${completeness}% written`,
      base,
    ),
    g(
      "disclosure",
      "Invention disclosure",
      disclosureDone ? "done" : "todo",
      disclosureDone ? "Complete" : "Add the plain-language intake",
      `${base}/disclosure`,
    ),
    g(
      "inventors",
      "Inventors and applicant",
      inventorsDone ? "done" : "todo",
      inventorsDone
        ? `${inventors.length} inventor${inventors.length === 1 ? "" : "s"} on the ADS`
        : "Add the inventors and the applicant",
      `${base}/inventors`,
    ),
    g(
      "drawings",
      "Drawings",
      attachments.length > 0 ? "done" : "todo",
      attachments.length > 0
        ? `${attachments.length} uploaded`
        : "Upload your figures",
      `${base}/uploads`,
    ),
    g(
      "issues",
      "Issues",
      toFix > 0 ? "violation" : toCheck > 0 ? "attention" : "done",
      toFix > 0
        ? `${toFix} to fix${toCheck ? `, ${toCheck} to check` : ""}`
        : toCheck > 0
          ? `${toCheck} to check`
          : "No issues found",
      `${base}/review`,
    ),
    g(
      "filing",
      "Filing readiness",
      filingFix > 0 ? "violation" : "done",
      filingFix > 0 ? `${filingFix} to fix before filing` : "No filing defects",
      `${base}/sign`,
    ),
    g(
      "priorart",
      "Prior art",
      priorArtCount > 0 ? "done" : "todo",
      priorArtCount > 0 ? `${priorArtCount} similar patents found` : "Run a search",
      `${base}/prior-art`,
    ),
    g(
      "sign",
      "Inventor declarations",
      signDone ? "done" : "todo",
      signDone ? "All inventors signed" : "Sign the declaration",
      `${base}/sign`,
    ),
    g(
      "export",
      "Export",
      (exportsRes.data ?? []).length > 0 ? "done" : "todo",
      (exportsRes.data ?? []).length > 0
        ? "Filing package exported"
        : "Export the filing package",
      `${base}/report`,
    ),
  ];

  if (hasDisclosure) {
    gates.splice(
      5,
      0,
      g(
        "consistency",
        "Consistency with the draft",
        consistency > 0 ? "attention" : "done",
        consistency > 0 ? `${consistency} to reconcile` : "Disclosure lines up",
        `${base}/disclosure`,
      ),
    );
  }

  // Next step: the first gate that needs action, violations first, then anything unfinished.
  const next =
    gates.find((x) => x.status === "violation") ??
    gates.find((x) => x.status === "todo") ??
    gates.find((x) => x.status === "attention") ??
    null;

  return {
    project,
    stage,
    completeness,
    gates,
    next: next ? { label: next.label, href: next.href } : null,
  };
}
