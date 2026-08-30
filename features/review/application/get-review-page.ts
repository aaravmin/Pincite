import "server-only";

/**
 * The whole Review screen in one read: the stored findings plus the two document-level check
 * families the screen banners summarize (filing readiness and disclosure consistency).
 *
 * Everything comes from ONE request-cached project snapshot plus one findings query, run
 * together, rather than the six independent loads the page used to perform. Returns null when
 * the matter is not visible to the viewer, which the page turns into notFound().
 */
import { requireViewer } from "@/shared/auth/require-viewer";
import { getProjectSnapshot } from "@/features/projects/application/get-project-snapshot";
import type { SectionKey } from "@/features/projects/domain/sections";
import type { Project } from "@/features/projects/domain/types";
import { runCrossRefChecks } from "@/features/review/domain/cross-reference";
import type { FilingFinding } from "@/features/review/domain/filing-checks";
import { runFilingChecks } from "@/features/review/domain/filing-checks";
import type { FindingRow } from "@/features/review/domain/finding";
import { hasSignedDeclaration } from "@/features/drawings/domain/types";
import { resolveFilingPins } from "@/features/review/application/resolve-pins";
import { loadFindings } from "@/features/review/infrastructure/findings-repository";

export type ReviewPageModel = {
  project: Project;
  sections: Record<SectionKey, string>;
  findings: FindingRow[];
  /** Filing-readiness checks, MPEP pins already resolved against the corpus. */
  filing: FilingFinding[];
  filingFix: number;
  filingCheck: number;
  /** Disclosure-to-draft consistency checks (cross-reference tier). */
  consistency: FilingFinding[];
};

export async function getReviewPage(
  projectId: string,
): Promise<ReviewPageModel | null> {
  const viewer = await requireViewer();
  const [snapshot, findings] = await Promise.all([
    getProjectSnapshot(projectId),
    loadFindings(viewer.supabase, projectId),
  ]);
  if (!snapshot) return null;

  const filing = await resolveFilingPins(
    runFilingChecks({
      project: snapshot.project,
      inventors: snapshot.inventors,
      hasSignedDeclaration: hasSignedDeclaration(snapshot.attachments),
      role: viewer.profile.role ?? null,
      title: snapshot.sections["title"] ?? "",
    }),
  );

  return {
    project: snapshot.project,
    sections: snapshot.sections,
    findings,
    filing,
    filingFix: filing.filter((f) => f.severity === "violation").length,
    filingCheck: filing.filter((f) => f.severity === "attention").length,
    consistency: runCrossRefChecks(snapshot.disclosure, snapshot.sections),
  };
}
