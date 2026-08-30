import { notFound } from "next/navigation";
import { requireViewer } from "@/shared/auth/require-viewer";
import { getProjectAudit } from "@/features/audit/application/get-project-audit";
import { HeaderActions } from "@/features/projects/ui/header-actions";
import { AuditClient } from "@/features/audit/ui/audit-client";

export default async function AuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireViewer();

  const entries = await getProjectAudit(id);
  if (!entries) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Audit log
          </span>
        </div>
        <HeaderActions projectId={id} />
      </header>
      <main className="flex-1">
        <AuditClient entries={entries} />
      </main>
    </div>
  );
}
