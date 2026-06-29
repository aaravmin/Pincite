import Link from "next/link";
import { HeaderActions } from "@/components/projects/header-actions";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/projects/queries";
import { type AuditEntry } from "@/lib/audit-log";
import { AuditClient } from "@/components/audit/audit-client";

export default async function AuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("consented_at")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.consented_at) redirect("/consent");

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
          <Link
            href={`/projects/${id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← {project.name}
          </Link>
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
