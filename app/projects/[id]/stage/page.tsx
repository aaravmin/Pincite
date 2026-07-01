import { HeaderActions } from "@/components/projects/header-actions";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProject, getSectionContent } from "@/lib/projects/queries";
import { detectStage } from "@/lib/stage/detect";
import { lifecycleActions, resolveActionPins } from "@/lib/lifecycle/actions";
import { StageClient } from "@/components/stage/stage-client";
import { NextActions } from "@/components/lifecycle/next-actions";
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("consented_at")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.consented_at) redirect("/consent");

  const project = await getProject(id);
  if (!project) notFound();
  const sections = await getSectionContent(id);
  const filled = Object.entries(sections)
    .filter(([, v]) => v.trim().length > 0)
    .map(([k]) => k);
  const stage = detectStage({
    filled,
    declared_status: project.declared_status,
    application_number: project.application_number,
    filing_date: project.filing_date,
    patent_type: project.patent_type,
  });
  const actions = await resolveActionPins(
    lifecycleActions(project.declared_status, project.patent_type),
  );

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
