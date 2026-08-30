import "server-only";

/**
 * The one canonical read of "everything the project screens need". The project layout, the
 * overview, review, filing, and the export pipeline all used to load sections, inventors,
 * attachments, disclosure, and the export state independently - the same six queries, run
 * several times per navigation, and occasionally disagreeing with each other.
 *
 * REQUEST CACHING. `cache()` dedupes within a single render pass / server action / route
 * handler only. It is not a persistent cache, so no user-scoped row is ever served to a
 * second request or a different account.
 *
 * AUTHORIZATION. `requireViewer()` establishes who is asking (and redirects if nobody is);
 * RLS then scopes every select to that owner, so a project belonging to someone else simply
 * returns no row and this loader answers `null` - which callers turn into notFound().
 */
import { cache } from "react";
import { requireViewer } from "@/shared/auth/require-viewer";
import type { SectionKey } from "@/features/projects/domain/sections";
import type { Project } from "@/features/projects/domain/types";
import type { Attachment, Inventor } from "@/lib/filing/types";
import type { Disclosure } from "@/lib/disclosure/types";
import {
  loadAttachments,
  loadDisclosure,
  loadExports,
  loadInventors,
  loadProject,
  loadSections,
  type ExportRecord,
} from "@/features/projects/infrastructure/snapshot-repository";

export type ProjectSnapshot = {
  project: Project;
  /** Every section key, "" when the row is missing. */
  sections: Record<SectionKey, string>;
  inventors: Inventor[];
  attachments: Attachment[];
  disclosure: Disclosure;
  exports: ExportRecord[];
};

export const getProjectSnapshot = cache(
  async (projectId: string): Promise<ProjectSnapshot | null> => {
    const { supabase } = await requireViewer();

    // The project row and its five child sets are independent reads, so they start
    // together rather than waiting on each other. An empty child set is normal (a new
    // matter has no inventors, no drawings, no exports) and is never an error.
    const [project, sections, inventors, attachments, disclosure, exports] =
      await Promise.all([
        loadProject(supabase, projectId),
        loadSections(supabase, projectId),
        loadInventors(supabase, projectId),
        loadAttachments(supabase, projectId),
        loadDisclosure(supabase, projectId),
        loadExports(supabase, projectId),
      ]);

    if (!project) return null;
    return { project, sections, inventors, attachments, disclosure, exports };
  },
);
