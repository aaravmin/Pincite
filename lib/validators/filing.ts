/**
 * Filing-readiness checks (the "filing" tier). Unlike tier1-3, these are document-level
 * (ADS + inventors + declarations), not span-based, so they are computed live and surfaced
 * on the Sign step and the Review screen rather than stored in the section findings table.
 * Each carries a CFR reference (display-only) and an MPEP pin that is validated against the
 * corpus before display (dropped if unresolved), honoring the anti-hallucination discipline.
 */
import type { Severity } from "@/lib/validators/types";
import type { Project } from "@/lib/projects/types";
import {
  type Inventor,
  type Declaration,
  type DeclarationStatements,
} from "@/lib/filing/types";
import type { UserRole } from "@/lib/profile";
import { validateCitations } from "@/lib/mpep/citation";

export type FilingFinding = {
  severity: Severity;
  actionable: boolean;
  title: string;
  explanation: string;
  mpep_section: string | null;
  cfr_ref: string | null;
};

const REQUIRED_STATEMENTS: {
  key: keyof DeclarationStatements;
  label: string;
}[] = [
  { key: "made_or_authorized", label: "the application was made or authorized" },
  { key: "original_inventor", label: "believes themselves the original inventor" },
  { key: "reviewed_understood", label: "reviewed and understands the application" },
  { key: "duty_to_disclose", label: "aware of the duty to disclose (37 CFR 1.56)" },
  { key: "penalty_acknowledged", label: "acknowledges the 18 U.S.C. 1001 penalty" },
];

/** Latest declaration per inventor (declarations are append-only). */
export function latestDeclarations(
  decls: Declaration[],
): Map<string, Declaration> {
  const m = new Map<string, Declaration>();
  for (const d of decls) {
    if (!d.inventor_id) continue;
    const prev = m.get(d.inventor_id);
    if (!prev || d.signed_at > prev.signed_at) m.set(d.inventor_id, d);
  }
  return m;
}

export function runFilingChecks(input: {
  project: Project;
  inventors: Inventor[];
  declarations: Declaration[];
  role: UserRole | null;
  title: string;
}): FilingFinding[] {
  const { project, inventors, declarations, title } = input;
  const out: FilingFinding[] = [];
  const current = latestDeclarations(declarations);

  // ----- ADS (PTO/AIA/14) completeness -----
  if (inventors.length === 0) {
    out.push({
      severity: "violation",
      actionable: true,
      title: "No inventor named",
      explanation:
        "At least one inventor must be named on the Application Data Sheet.",
      mpep_section: "601.05(a)",
      cfr_ref: "37 CFR 1.76",
    });
  }
  inventors.forEach((inv, i) => {
    const who = inv.legal_name.trim() || `Inventor ${i + 1}`;
    if (!inv.legal_name.trim())
      out.push({
        severity: "violation",
        actionable: true,
        title: `Inventor ${i + 1} is missing a legal name`,
        explanation: "Each inventor's full legal name is required on the ADS.",
        mpep_section: "601.05(a)",
        cfr_ref: "37 CFR 1.76(b)(1)",
      });
    if (!inv.residence.trim())
      out.push({
        severity: "violation",
        actionable: true,
        title: `${who} is missing a residence`,
        explanation:
          "Each inventor's residence (city and state or country) is required.",
        mpep_section: "601.05(a)",
        cfr_ref: "37 CFR 1.76(b)(1)",
      });
    if (!inv.mailing_address.trim())
      out.push({
        severity: "violation",
        actionable: true,
        title: `${who} is missing a mailing address`,
        explanation: "Each inventor's mailing address is required on the ADS.",
        mpep_section: "601.05(a)",
        cfr_ref: "37 CFR 1.76(b)(1)",
      });
  });

  if (!title.trim())
    out.push({
      severity: "attention",
      actionable: true,
      title: "Invention title is missing",
      explanation: "The ADS and your draft both need the invention title.",
      mpep_section: null,
      cfr_ref: "37 CFR 1.76",
    });

  if (!project.applicant_is_inventor && !(project.applicant_name ?? "").trim())
    out.push({
      severity: "violation",
      actionable: true,
      title: "Applicant name is missing",
      explanation:
        "When the applicant is not the inventor(s), the applicant's name is required on the ADS.",
      mpep_section: "601.05(a)",
      cfr_ref: "37 CFR 1.76(b)(7)",
    });

  // ----- Inventor declarations (37 CFR 1.63 / PTO-AIA-01) -----
  inventors.forEach((inv, i) => {
    const who = inv.legal_name.trim() || `Inventor ${i + 1}`;
    const decl = current.get(inv.id);
    if (!decl) {
      out.push({
        severity: "violation",
        actionable: true,
        title: `${who} has not signed the inventor's declaration`,
        explanation:
          "Each inventor must sign an oath or declaration (PTO/AIA/01) for the application.",
        mpep_section: "602",
        cfr_ref: "37 CFR 1.63",
      });
      return;
    }
    if (
      inv.legal_name.trim() &&
      decl.legal_name.trim() &&
      decl.legal_name.trim().toLowerCase() !== inv.legal_name.trim().toLowerCase()
    ) {
      out.push({
        severity: "attention",
        actionable: true,
        title: `Declaration name does not match the ADS for ${who}`,
        explanation: `The declaration was signed as "${decl.legal_name}" but the ADS names "${inv.legal_name}". The names should match.`,
        mpep_section: "602.01(a)",
        cfr_ref: "37 CFR 1.76(d)",
      });
    }
    const missing = REQUIRED_STATEMENTS.filter((s) => !decl.statements?.[s.key]);
    if (missing.length > 0) {
      out.push({
        severity: "violation",
        actionable: true,
        title: `Declaration for ${who} is missing a required statement`,
        explanation: `A complete declaration must state: ${missing
          .map((m) => m.label)
          .join("; ")}.`,
        mpep_section: "602",
        cfr_ref: "37 CFR 1.63",
      });
    }
  });

  // ----- Inventorship / ownership consistency -----
  if (project.applicant_is_juristic && project.applicant_is_inventor)
    out.push({
      severity: "attention",
      actionable: true,
      title: "A company cannot also be the inventor",
      explanation:
        "Inventors must be natural persons. If a company owns the invention, set the applicant as the assignee, not the inventor.",
      mpep_section: "2109",
      cfr_ref: "35 U.S.C. 100(f)",
    });
  if (!project.applicant_is_inventor)
    out.push({
      severity: "attention",
      actionable: false,
      title: "Record the assignment before the issue fee",
      explanation:
        "When the applicant is an assignee, the assignment must be recorded in the USPTO no later than issue-fee payment for the assignee to be named on the patent.",
      mpep_section: "302",
      cfr_ref: "37 CFR 3.81",
    });

  // ----- Who-may-sign / entity certifications -----
  if (project.applicant_is_juristic)
    out.push({
      severity: "attention",
      actionable: false,
      title: "A juristic applicant must be represented by a registered practitioner",
      explanation:
        "When the applicant is a company or other juristic entity, the ADS and prosecution papers must be signed by a registered patent practitioner.",
      mpep_section: "402",
      cfr_ref: "37 CFR 1.33(b)",
    });

  if (project.entity_status === "micro")
    out.push({
      severity: "attention",
      actionable: false,
      title: "Micro entity status requires a certification",
      explanation:
        "File a micro-entity certification (PTO/SB/15A gross-income basis or PTO/SB/15B institution basis) before paying micro-entity fees, and re-certify at each fee payment.",
      mpep_section: null,
      cfr_ref: "37 CFR 1.29",
    });
  else if (project.entity_status === "small")
    out.push({
      severity: "attention",
      actionable: false,
      title: "Small entity status is a certification",
      explanation:
        "Paying the small-entity fee certifies small-entity status (37 CFR 1.27). Status is lost if rights are assigned or licensed to a large entity.",
      mpep_section: null,
      cfr_ref: "37 CFR 1.27",
    });

  return out;
}

/** Validate MPEP pins against the corpus; drop unresolved (the CFR ref still shows). */
export async function resolveFilingPins(
  findings: FilingFinding[],
): Promise<FilingFinding[]> {
  const pins = findings
    .map((f) => f.mpep_section)
    .filter((p): p is string => !!p);
  const resolved = pins.length ? await validateCitations(pins) : new Set<string>();
  return findings.map((f) => ({
    ...f,
    mpep_section:
      f.mpep_section && resolved.has(f.mpep_section) ? f.mpep_section : null,
  }));
}
