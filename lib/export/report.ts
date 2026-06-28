/**
 * Build the review report (roadmap §9): project metadata + detected stage, the draft
 * sections, findings grouped by severity with pins, the applies-now/conditional rules,
 * and the prior-art matches with overlaps. toText is the TXT serializer (inherently
 * grayscale-legible); the /report view renders the same content for print-to-PDF.
 */
import { getProject, getSectionContent } from "@/lib/projects/queries";
import { getReview, type FindingRow } from "@/lib/validators/results";
import { getPriorArtResults, type ResultMatch } from "@/lib/patents/results";
import { detectStage } from "@/lib/stage/detect";
import {
  surfaceRules,
  type SurfacedRule,
  type ConditionalRule,
} from "@/lib/rules/surface";
import { SECTION_KEYS, SECTION_LABELS } from "@/lib/projects/sections";
import type { Project } from "@/lib/projects/types";

export type Report = {
  project: Project;
  stage: string;
  generatedAt: string;
  sections: { key: string; label: string; content: string }[];
  findings: FindingRow[];
  appliesNow: SurfacedRule[];
  conditional: ConditionalRule[];
  priorArt: ResultMatch[];
};

export async function buildReportData(projectId: string): Promise<Report | null> {
  const project = await getProject(projectId);
  if (!project) return null;

  const map = await getSectionContent(projectId);
  const filled = Object.entries(map)
    .filter(([, v]) => v.trim().length > 0)
    .map(([k]) => k);
  const stage = detectStage({
    filled,
    declared_status: project.declared_status,
    application_number: project.application_number,
    filing_date: project.filing_date,
    patent_type: project.patent_type,
  }).label;

  const { findings } = await getReview(projectId);
  const { matches } = await getPriorArtResults(projectId);
  const { appliesNow, conditional } = surfaceRules({
    patentType: project.patent_type,
    filled,
    sections: map,
    declared_status: project.declared_status,
  });
  const sections = SECTION_KEYS.map((k) => ({
    key: k,
    label: SECTION_LABELS[k],
    content: map[k] ?? "",
  })).filter((s) => s.content.trim().length > 0);

  return {
    project,
    stage,
    generatedAt: new Date().toISOString(),
    sections,
    findings,
    appliesNow,
    conditional,
    priorArt: matches,
  };
}

const pin = (cfr: string | null, mpep: string | null) =>
  [cfr, mpep ? `MPEP ${mpep}` : null].filter(Boolean).join(" · ");

export function toText(r: Report): string {
  const L: string[] = [];
  L.push(`PINCITE REVIEW — ${r.project.name}`);
  L.push(
    `Type: ${r.project.patent_type} · Stage: ${r.stage} · Generated: ${r.generatedAt}`,
  );
  L.push(
    "A research aid, not legal advice. Verify every item against the cited source.",
  );
  L.push("");

  L.push("== DRAFT ==");
  for (const s of r.sections) {
    L.push(`-- ${s.label} --`);
    L.push(s.content.trim());
    L.push("");
  }

  L.push("== FINDINGS ==");
  for (const [sev, label] of [
    ["violation", "VIOLATIONS"],
    ["attention", "ATTENTION"],
  ] as const) {
    const list = r.findings.filter((f) => f.severity === sev);
    if (!list.length) continue;
    L.push(`-- ${label} --`);
    for (const f of list) {
      L.push(`[${f.actionable ? "FIXABLE" : "INFORMATIONAL"}] ${f.title}`);
      L.push(`   ${f.explanation}`);
      L.push(`   ${pin(f.cfr_ref, f.mpep_section)}`);
    }
    L.push("");
  }
  if (r.findings.length === 0) L.push("(no findings)\n");

  L.push("== RULES THAT APPLY NOW ==");
  for (const ru of r.appliesNow)
    L.push(`- ${ru.note} (${pin(ru.cfr_ref, ru.mpep_section)})`);
  L.push("");

  L.push("== RULES THAT MAY APPLY NEXT ==");
  for (const ru of r.conditional)
    L.push(
      `- ${ru.trigger}: ${ru.note}${ru.triggered ? " [NOW APPLIES]" : ""} (${pin(ru.cfr_ref, ru.mpep_section)})`,
    );
  L.push("");

  L.push("== SIMILAR PATENTS ==");
  if (!r.priorArt.length) L.push("(none run)");
  for (const m of r.priorArt) {
    L.push(
      `- ${m.patent_number}${m.title ? ` — ${m.title}` : ""} (score ${m.overall_score?.toFixed(2) ?? "—"})`,
    );
    for (const sp of m.spans)
      L.push(
        `    ${sp.overlap_type === "claim_limitation" ? "[reads on full limitation]" : "[overlap]"} ${sp.patent_span_text.slice(0, 140)}`,
      );
  }
  L.push("");
  L.push(
    "Research signal only — not a validity or freedom-to-operate opinion.",
  );
  return L.join("\n");
}
