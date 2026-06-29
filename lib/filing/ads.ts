/**
 * Application Data Sheet (PTO/AIA/14) data card. This is the structured bibliographic
 * data the user types into Patent Center's Web ADS (the USPTO's preferred path), and what
 * the export's data card mirrors. We surface what is captured and what is still missing.
 */
import type { Project } from "@/lib/projects/types";
import type { Inventor } from "@/lib/filing/types";
import { ENTITY_STATUS_LABELS } from "@/lib/projects/sections";

export type AdsCard = {
  rows: { label: string; value: string }[];
  inventors: Inventor[];
  applicantName: string;
  missing: string[];
};

export function applicantName(project: Project, inventors: Inventor[]): string {
  if (project.applicant_is_inventor) {
    return inventors
      .map((i) => i.legal_name.trim())
      .filter(Boolean)
      .join("; ");
  }
  return project.applicant_name?.trim() ?? "";
}

export function buildAds(
  project: Project,
  inventors: Inventor[],
  title: string,
): AdsCard {
  const t = (title ?? "").trim();
  const missing: string[] = [];
  if (!t) missing.push("Invention title");
  if (inventors.length === 0) missing.push("At least one inventor");
  inventors.forEach((inv, i) => {
    const n = i + 1;
    if (!inv.legal_name.trim()) missing.push(`Inventor ${n} legal name`);
    if (!inv.residence.trim()) missing.push(`Inventor ${n} residence`);
    if (!inv.mailing_address.trim()) missing.push(`Inventor ${n} mailing address`);
  });

  const appName = applicantName(project, inventors);
  if (!project.applicant_is_inventor && !appName) missing.push("Applicant name");

  const rows = [
    { label: "Invention title", value: t || "-" },
    { label: "Applicant", value: appName || "-" },
    {
      label: "Applicant type",
      value: project.applicant_is_juristic
        ? "Juristic entity (company)"
        : "Individual inventor(s)",
    },
    { label: "Entity status", value: ENTITY_STATUS_LABELS[project.entity_status] },
    { label: "Inventors named", value: String(inventors.length) },
  ];

  return { rows, inventors, applicantName: appName, missing };
}
