import { notFound } from "next/navigation";
import { getProjectPage } from "@/features/projects/application/get-project-page";
import { Workspace } from "@/features/projects/ui/workspace";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const model = await getProjectPage(id);
  if (!model) notFound();

  return <Workspace project={model.project} initialSections={model.sections} />;
}
