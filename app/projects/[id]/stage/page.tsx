import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProject, getSectionContent } from "@/lib/projects/queries";
import { detectStage } from "@/lib/stage/detect";
import { lifecycleActions, resolveActionPins } from "@/lib/lifecycle/actions";
import { StageClient } from "@/components/stage/stage-client";
import { NextActions } from "@/components/lifecycle/next-actions";

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
          <Link
            href={`/projects/${id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← {project.name}
          </Link>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Stage
          </span>
        </div>
      </header>
      <main className="flex-1">
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
