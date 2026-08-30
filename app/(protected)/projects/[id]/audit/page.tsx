import { HeaderActions } from "@/components/projects/header-actions";
import { notFound } from "next/navigation";
import { requireViewer } from "@/shared/auth/require-viewer";
import { getProject } from "@/lib/projects/queries";
import { type AuditEntry } from "@/lib/audit-log";
import { AuditClient } from "@/components/audit/audit-client";

export default async function AuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { supabase } = await requireViewer();

  const project = await getProject(id);
  if (!project) notFound();
  const { data: rows } = await supabase
    .from("audit_log")
    .select("id, action, detail, created_at")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(500);
  const entries = (rows as AuditEntry[]) ?? [];

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
