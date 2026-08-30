import { notFound } from "next/navigation";
import { requireViewer } from "@/shared/auth/require-viewer";
import { getPriorArtPage } from "@/features/prior-art/application/get-prior-art-page";
import { HeaderActions } from "@/features/projects/ui/header-actions";
import { PriorArtClient } from "@/features/prior-art/ui/prior-art-client";

export default async function PriorArtPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireViewer();

  const model = await getPriorArtPage(id);
  if (!model) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Similar patents
          </span>
        </div>
        <HeaderActions projectId={id} />
      </header>
      <PriorArtClient
        projectId={id}
        claims={model.claims}
        matches={model.matches}
      />
    </div>
  );
}
