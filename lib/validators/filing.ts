/**
 * Filing-readiness checks (the "filing" tier). Unlike tier1-3, these are document-level
 * (ADS + inventors + the signed declaration), not span-based, so they are computed live and
 * surfaced on the Review screen and the readiness overview rather than stored in findings.
 * Each carries a CFR reference (display-only) and an MPEP pin that is validated against the
 * corpus before display (dropped if unresolved), honoring the anti-hallucination discipline.
 */
import type { Severity } from "@/lib/validators/types";
import type { Project } from "@/lib/projects/types";
import { type Inventor } from "@/lib/filing/types";
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

export function runFilingChecks(input: {
  project: Project;
  inventors: Inventor[];
  /**
   * Whether the signed inventor's declaration document has been uploaded. The operative
   * signature lives on that document - the inventor signs it by hand, so Pincite only checks
   * that it is present, never that the signature itself is valid.
   */
  hasSignedDeclaration: boolean;
  role: UserRole | null;
  title: string;
}): FilingFinding[] {
  const { project, inventors, hasSignedDeclaration, title } = input;
  const out: FilingFinding[] = [];

  // ----- ADS (PTO/AIA/14) completeness -----
  if (inventors.length === 0) {
    out.push({
      severity: "violation",
      actionable: true,
      title: "No inventor named",
      explanation: "Name at least one inventor on the ADS.",
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
        explanation: "Full legal name is required.",
        mpep_section: "601.05(a)",
        cfr_ref: "37 CFR 1.76(b)(1)",
      });
    if (!inv.residence.trim())
      out.push({
        severity: "violation",
        actionable: true,
        title: `${who} is missing a residence`,
        explanation: "City and state or country is required.",
        mpep_section: "601.05(a)",
        cfr_ref: "37 CFR 1.76(b)(1)",
      });
    if (!inv.mailing_address.trim())
      out.push({
        severity: "violation",
        actionable: true,
        title: `${who} is missing a mailing address`,
        explanation: "Mailing address is required.",
        mpep_section: "601.05(a)",
        cfr_ref: "37 CFR 1.76(b)(1)",
      });
  });

  if (!title.trim())
    out.push({
      severity: "attention",
      actionable: true,
      title: "Invention title is missing",
      explanation: "The ADS and draft both need the title.",
      mpep_section: null,
      cfr_ref: "37 CFR 1.76",
    });

  if (!project.applicant_is_inventor && !(project.applicant_name ?? "").trim())
    out.push({
      severity: "violation",
      actionable: true,
      title: "Applicant name is missing",
      explanation: "Required when the applicant isn't the inventor.",
      mpep_section: "601.05(a)",
      cfr_ref: "37 CFR 1.76(b)(7)",
    });

  // ----- Inventor declarations (37 CFR 1.63 / PTO-AIA-01) -----
  // The operative signature is on the declaration document itself, signed by hand. We only
  // check that a signed copy has been uploaded; we do not (and cannot) verify the signature.
  if (inventors.length > 0 && !hasSignedDeclaration) {
    const everyone =
      inventors.length === 1
        ? "The inventor"
        : "Each of the named inventors";
    out.push({
      severity: "violation",
      actionable: true,
      title: "Signed inventor's declaration not uploaded",
      explanation: `${everyone} signs an oath or declaration (PTO/AIA/01). Download it on the Sign step, sign by hand, and upload the signed copy.`,
      mpep_section: "602",
      cfr_ref: "37 CFR 1.63",
    });
  }

  // ----- Inventorship / ownership consistency -----
  if (project.applicant_is_juristic && project.applicant_is_inventor)
    out.push({
      severity: "attention",
      actionable: true,
      title: "A company cannot also be the inventor",
      explanation:
        "Inventors must be people. Set the company as applicant/assignee, not inventor.",
      mpep_section: "2109",
      cfr_ref: "35 U.S.C. 100(f)",
    });
  if (!project.applicant_is_inventor)
    out.push({
      severity: "attention",
      actionable: false,
      title: "Record the assignment before the issue fee",
      explanation:
        "Record it at the USPTO by issue-fee payment for the assignee to appear on the patent.",
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
        "A registered patent practitioner must sign the ADS and prosecution papers.",
      mpep_section: "402",
      cfr_ref: "37 CFR 1.33(b)",
    });

  if (project.entity_status === "micro")
    out.push({
      severity: "attention",
      actionable: false,
      title: "Micro entity status requires a certification",
      explanation:
        "File a micro-entity certification before paying micro-entity fees, and re-certify at each payment.",
      mpep_section: null,
      cfr_ref: "37 CFR 1.29",
    });
  else if (project.entity_status === "small")
    out.push({
      severity: "attention",
      actionable: false,
      title: "Small entity status is a certification",
      explanation:
        "Paying the small-entity fee certifies it; lost if you assign or license to a large entity.",
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
