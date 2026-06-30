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

/**
 * The next action that reflects ACTUAL progress, not just the declared status. Post-filing
 * states defer to the lifecycle above; a drafting matter walks the real gaps (finish the
 * draft, add inventors, fix issues, sign, file) so the dashboard never says "Drafting" when
 * the draft is already complete.
 */
export function dashboardNextStep(input: {
  status: ProjectStatus;
  draftComplete: boolean;
  inventorCount: number;
  openIssues: number;
  signedCount: number;
}): NextStep {
  if (input.status !== "drafting") return nextStep(input.status);
  if (!input.draftComplete) return { label: "Finish the draft", urgent: false };
  if (input.inventorCount === 0) return { label: "Add inventors", urgent: false };
  if (input.openIssues > 0)
    return {
      label: `Fix ${input.openIssues} issue${input.openIssues === 1 ? "" : "s"}`,
      urgent: false,
    };
  if (input.signedCount === 0) return { label: "Sign the declaration", urgent: false };
  return { label: "Export and file", urgent: false };
}
