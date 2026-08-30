import { notFound } from "next/navigation";
import { requireViewer } from "@/shared/auth/require-viewer";
import { getProject, getSectionContent } from "@/lib/projects/queries";
import { Workspace } from "@/components/projects/workspace";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await requireViewer();

  const project = await getProject(id);
  if (!project) notFound();
  const sections = await getSectionContent(id);

  return <Workspace project={project} initialSections={sections} />;
}
