import type { ReactNode } from "react";
import { requireViewer } from "@/shared/auth/require-viewer";
import { StepRail } from "@/components/workspace/step-rail";
import { getProjectSnapshot } from "@/features/projects/application/get-project-snapshot";
import {
  NO_STEPS_DONE,
  stepProgress,
} from "@/features/projects/domain/step-progress";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Layouts are defense in depth, not the only gate: Next does not re-render a layout on a
  // soft navigation between routes that share it, so every page below calls requireViewer()
  // too. Within one render the call is deduped by the React cache.
  await requireViewer();

  // One request-cached read for the whole matter; the pages inside this layout share it.
  // A matter the viewer cannot see renders the rail with nothing ticked - the page below
  // is what turns that into notFound().
  const snapshot = await getProjectSnapshot(id);
  const done = snapshot
    ? stepProgress({
        sections: snapshot.sections,
        inventors: snapshot.inventors,
        attachments: snapshot.attachments,
        disclosure: snapshot.disclosure,
        hasExport: snapshot.exports.length > 0,
      })
    : NO_STEPS_DONE;

  return (
    <div className="flex min-h-screen bg-background">
      <StepRail projectId={id} done={done} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
