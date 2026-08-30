import "server-only";

/**
 * Load everything an export needs, once. Every format - TXT, the typeset PDF, the spec DOCX,
 * the LaTeX bundle, the filing package - reads the same project, sections, inventors and
 * attachments, so they come from one request-cached `ProjectSnapshot` rather than each format
 * branch re-running its own queries.
 *
 * Sanitization happens here, at the boundary between stored text and generated documents, so
 * no formatter can forget it: the section text and the inventor fields go out through
 * `sanitizeOutputText`. The project row is left as stored (its fields are sanitized where they
 * are printed) and the attachment rows are left verbatim, since their storage paths must match
 * the bucket exactly.
 */
import { getProjectSnapshot } from "@/features/projects/application/get-project-snapshot";
import type { ExportContext } from "@/features/exports/types";
import {
  sanitizeOutputRecord,
  sanitizeOutputText,
} from "@/shared/text/sanitize";

export type LoadExportContextDeps = {
  loadSnapshot: typeof getProjectSnapshot;
};

const defaultDeps: LoadExportContextDeps = { loadSnapshot: getProjectSnapshot };

export async function loadExportContext(
  projectId: string,
  deps: LoadExportContextDeps = defaultDeps,
): Promise<ExportContext | null> {
  const snapshot = await deps.loadSnapshot(projectId);
  if (!snapshot) return null;

  const sections = sanitizeOutputRecord(snapshot.sections);
  return {
    project: snapshot.project,
    sections,
    inventors: snapshot.inventors.map((i) => ({
      ...i,
      legal_name: sanitizeOutputText(i.legal_name),
      residence: sanitizeOutputText(i.residence),
      mailing_address: sanitizeOutputText(i.mailing_address),
      citizenship: sanitizeOutputText(i.citizenship),
    })),
    attachments: snapshot.attachments,
    title: sections["title"] ?? "",
  };
}
