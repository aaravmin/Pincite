import { notFound } from "next/navigation";
import { requireViewer } from "@/shared/auth/require-viewer";
import { getProjectPage } from "@/features/projects/application/get-project-page";
import { Workspace } from "@/features/projects/ui/workspace";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireViewer();

  const model = await getProjectPage(id);
  if (!model) notFound();

  return <Workspace project={model.project} initialSections={model.sections} />;
}
