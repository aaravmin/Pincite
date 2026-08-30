import { HeaderActions } from "@/components/projects/header-actions";
import { notFound } from "next/navigation";
import { requireViewer } from "@/shared/auth/require-viewer";
import { getProject } from "@/lib/projects/queries";
import { getAttachments } from "@/lib/filing/queries";
import { UploadsPanel } from "@/components/uploads/uploads-panel";

export default async function UploadsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await requireViewer();

  const project = await getProject(id);
  if (!project) notFound();
  const attachments = await getAttachments(id);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Drawings &amp; documents
          </span>
        </div>
        <HeaderActions projectId={id} />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <p className="text-sm text-muted-foreground">
          Figures go into the filing package.
        </p>
        <div className="mt-6">
          <UploadsPanel projectId={id} initial={attachments} />
        </div>
      </main>
    </div>
  );
}
