import type { ProjectStatus } from "@/lib/projects/sections";

/**
 * The single most important next action for a project, derived from its declared status.
 * `urgent` marks the deadline-critical states (an office action reply and the issue fee),
 * which the dashboard surfaces with the attention signal per the legal-tech UI brief.
 */
export type NextStep = { label: string; urgent: boolean };

export function nextStep(status: ProjectStatus): NextStep {
  switch (status) {
    case "office_action":
      return { label: "Reply to office action", urgent: true };
    case "allowed":
      return { label: "Pay the issue fee", urgent: true };
    case "granted":
      return { label: "Maintenance fees", urgent: false };
    case "filed":
    case "published":
      return { label: "Awaiting examination", urgent: false };
    case "drafting":
    default:
      return { label: "Drafting", urgent: false };
  }
}
