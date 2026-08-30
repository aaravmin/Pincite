import { notFound } from "next/navigation";
import { HeaderActions } from "@/components/projects/header-actions";
import { getDisclosurePage } from "@/features/disclosure/application/get-disclosure-page";
import { DisclosureWorkspace } from "@/features/disclosure/ui/disclosure-workspace";

export default async function DisclosurePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const model = await getDisclosurePage(id);
  if (!model) notFound();

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
        initial={model.disclosure}
        consistency={model.consistency}
      />
    </div>
  );
}
