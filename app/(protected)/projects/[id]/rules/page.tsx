import { notFound } from "next/navigation";
import { requireViewer } from "@/shared/auth/require-viewer";
import { getRulesPage } from "@/features/rules/application/get-rules-page";
import { HeaderActions } from "@/features/projects/ui/header-actions";
import { RulesClient } from "@/features/rules/ui/rules-client";

export default async function RulesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireViewer();

  const model = await getRulesPage(id);
  if (!model) notFound();

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Rules
          </span>
        </div>
        <HeaderActions projectId={id} />
      </header>
      <div className="min-h-0 flex-1">
        <RulesClient
          appliesNow={model.appliesNow}
          conditional={model.conditional}
        />
      </div>
    </div>
  );
}
