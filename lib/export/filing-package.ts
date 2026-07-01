/**
 * Plain-text filing documents that accompany the specification DOCX in the export package.
 * These mirror what the user enters into Patent Center (ADS data), the inventor's
 * declaration text (PTO/AIA/01), and a transmittal + fee checklist. No internal analysis.
 */
import type { Project } from "@/lib/projects/types";
import type { Inventor } from "@/lib/filing/types";
import { ENTITY_STATUS_LABELS } from "@/lib/projects/sections";
import { applicantName } from "@/lib/filing/ads";

export function buildAdsText(
  project: Project,
  inventors: Inventor[],
  title: string,
): string {
  const lines: string[] = [];
  lines.push("APPLICATION DATA SHEET (PTO/AIA/14) - data for Patent Center Web ADS");
  lines.push("");
  lines.push(`Invention title: ${title.trim() || "[not provided]"}`);
  lines.push(
    `Applicant: ${applicantName(project, inventors) || "[not provided]"} (${
      project.applicant_is_juristic ? "juristic entity" : "individual inventor(s)"
    })`,
  );
  lines.push(`Entity status: ${ENTITY_STATUS_LABELS[project.entity_status]}`);
  lines.push("");
  lines.push("Inventors:");
  if (inventors.length === 0) lines.push("  [none entered]");
  inventors.forEach((inv, i) => {
    lines.push(`  ${i + 1}. ${inv.legal_name || "[name missing]"}`);
    lines.push(`     Residence: ${inv.residence || "[missing]"}`);
    lines.push(`     Mailing address: ${inv.mailing_address || "[missing]"}`);
    lines.push(`     Citizenship: ${inv.citizenship || "[not provided]"}`);
  });
  lines.push("");
  lines.push(
    "Correspondence address: confirm in Patent Center (defaults to the applicant address).",
  );
  return lines.join("\n");
}

export const DECLARATION_STATEMENTS = [
  "This application was made or authorized to be made by me.",
  "I believe I am the original inventor or an original joint inventor of a claimed invention in the application.",
  "I have reviewed and understand the contents of the application, including the claims.",
  "I am aware of the duty to disclose to the USPTO all information known to be material to patentability (37 CFR 1.56).",
  "I acknowledge that willful false statements are punishable under 18 U.S.C. 1001 by fine or imprisonment of up to 5 years, or both.",
];

/**
 * The declaration cover sheet (a reference copy of the 1.63 contents). The operative document
 * is each inventor's hand-signed declaration, bundled in the package under `declarations/`;
 * `signedFiles` are those filenames. This text never stands in for the signature.
 */
export function buildDeclarationText(
  inventors: Inventor[],
  signedFiles: string[],
  title: string,
): string {
  const lines: string[] = [];
  lines.push("INVENTOR'S DECLARATION (37 CFR 1.63 / PTO-AIA-01)");
  lines.push("");
  lines.push(`Application title: ${title.trim() || "[not provided]"}`);
  lines.push("");
  lines.push("Each named inventor declares that:");
  for (const s of DECLARATION_STATEMENTS) lines.push(`  - ${s}`);
  lines.push("");
  lines.push("Named inventors who must sign the declaration:");
  if (inventors.length === 0) lines.push("  [no inventors entered]");
  for (const inv of inventors) lines.push(`  - ${inv.legal_name || "[unnamed]"}`);
  lines.push("");
  if (signedFiles.length > 0) {
    lines.push("Signed declaration document(s) included in this package:");
    for (const f of signedFiles) lines.push(`  - declarations/${f}`);
  } else {
    lines.push(
      "NO SIGNED DECLARATION INCLUDED. Download the declaration in Pincite, have each inventor",
    );
    lines.push(
      "sign it by hand, and upload the signed copy before you file - that signed copy is the",
    );
    lines.push("operative declaration.");
  }
  lines.push("");
  lines.push(
    "The operative signature is the one each inventor places on the signed document; the text",
  );
  lines.push(
    "above is only a reference copy of the declaration's contents. Pincite does not file for you.",
  );
  return lines.join("\n");
}

export function buildTransmittalAndFeesText(project: Project): string {
  const lines: string[] = [];
  lines.push("UTILITY PATENT APPLICATION TRANSMITTAL (PTO/AIA/15) - checklist");
  lines.push("");
  lines.push("Documents in this package:");
  lines.push("  [x] Specification (specification.docx) - DOCX avoids the non-DOCX surcharge");
  lines.push("  [ ] Drawings (PDF) - upload your figures in Patent Center");
  lines.push("  [x] Application Data Sheet data (application-data-sheet.txt) - enter via Web ADS");
  lines.push(
    "  [x] Inventor's declaration - signed copies in declarations/ (PTO/AIA/01, 37 CFR 1.63)",
  );
  lines.push("  [ ] Fees - pay in Patent Center");
  lines.push("");
  lines.push("FEE SUMMARY (confirm current amounts on the USPTO fee schedule)");
  lines.push(`Entity status: ${ENTITY_STATUS_LABELS[project.entity_status]}`);
  lines.push("  - Basic filing fee");
  lines.push("  - Search fee");
  lines.push("  - Examination fee");
  lines.push("  - Excess claims fees (if more than 20 total or more than 3 independent claims)");
  lines.push(
    "  - DOCX: filing the specification in DOCX avoids the non-DOCX surcharge ($86 micro / $172 small / $430 large, 2025).",
  );
  lines.push("");
  lines.push(
    "Discounts: small entity = 50% off (37 CFR 1.27); micro entity = 80% off (37 CFR 1.29).",
  );
  if (project.entity_status === "micro")
    lines.push(
      "Micro entity: file PTO/SB/15A or 15B before paying micro fees, and re-certify at each payment.",
    );
  return lines.join("\n");
}

export function buildReadme(): string {
  return [
    "HOW TO FILE WITH THE USPTO (Patent Center)",
    "",
    "1. Go to patentcenter.uspto.gov and sign in (ID.me verification is required).",
    "2. Start a new nonprovisional utility application.",
    "3. Upload specification.docx as the specification (DOCX avoids the surcharge).",
    "   After upload, review the USPTO-converted PDF - that converted file is the official record.",
    "4. Enter the Application Data Sheet using the Web ADS form, from application-data-sheet.txt.",
    "5. Upload your drawings as a PDF.",
    "6. Upload each inventor's signed declaration (PTO/AIA/01) from the declarations/ folder.",
    "7. Pay the fees.",
    "",
    "Pincite does not file for you; you submit these documents yourself. This package contains",
    "only filing documents - no internal analysis.",
  ].join("\n");
}
