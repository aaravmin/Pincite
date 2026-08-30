import { HeaderActions } from "@/components/projects/header-actions";
import { notFound } from "next/navigation";
import { requireViewer } from "@/shared/auth/require-viewer";
import { getProject, getSectionContent } from "@/lib/projects/queries";
import { getDisclosure } from "@/lib/disclosure/queries";
import { runCrossRefChecks, resolveCrossRefPins } from "@/lib/validators/crossref";
import { DisclosureWorkspace } from "@/components/disclosure/disclosure-workspace";

export default async function DisclosurePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await requireViewer();

  const project = await getProject(id);
  if (!project) notFound();
  const [disclosure, sections] = await Promise.all([
    getDisclosure(id),
    getSectionContent(id),
  ]);
  const consistency = await resolveCrossRefPins(
    runCrossRefChecks(disclosure, sections),
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Invention intake
          </span>
        </div>
        <HeaderActions projectId={id} />
      </header>

      <DisclosureWorkspace
        projectId={id}
        initial={disclosure}
        consistency={consistency}
      />
    </div>
  );
}
