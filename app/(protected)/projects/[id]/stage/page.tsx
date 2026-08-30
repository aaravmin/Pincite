import { HeaderActions } from "@/features/projects/ui/header-actions";
import { notFound } from "next/navigation";
import { requireViewer } from "@/shared/auth/require-viewer";
import { getStagePage } from "@/features/projects/application/get-stage-page";
import { StageClient } from "@/features/projects/ui/stage/stage-client";
import { NextActions } from "@/features/projects/ui/stage/next-actions";
import { LifecycleTimeline } from "@visual/lifecycle-timeline";

const STAGE_INDEX: Record<string, number> = {
  drafting: 0,
  filed: 1,
  published: 1,
  office_action: 2,
  allowed: 3,
  granted: 4,
};

export default async function StagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireViewer();

  const model = await getStagePage(id);
  if (!model) notFound();
  const { project, stage, actions } = model;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Stage
          </span>
        </div>
        <HeaderActions projectId={id} />
      </header>
      <main className="flex-1">
        <div className="mx-auto w-full max-w-4xl px-6 pt-8">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Lifecycle</h2>
              <span className="text-xs text-muted-foreground">Draft to grant</span>
            </div>
            <LifecycleTimeline
              currentIndex={STAGE_INDEX[project.declared_status] ?? 0}
              currentDetail={stage.label}
              nextMarker={
                actions.find((a) => a.deadline)
                  ? { label: actions.find((a) => a.deadline)!.deadline as string }
                  : null
              }
            />
          </div>
        </div>
        <StageClient
          projectId={id}
          stage={stage}
          declaredStatus={project.declared_status}
          applicationNumber={project.application_number}
          filingDate={project.filing_date}
        />
        <NextActions actions={actions} />
      </main>
    </div>
  );
}
