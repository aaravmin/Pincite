import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildReportData } from "@/lib/export/report";
import { ReportView } from "@/components/export/report-view";
import { ReportToolbar } from "@/components/export/report-toolbar";

export default async function ReportPage({
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

  const report = await buildReportData(id);
  if (!report) notFound();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-3 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← {report.project.name}
          </Link>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Export
          </span>
        </div>
      </header>
      <ReportToolbar projectId={id} />
      <ReportView report={report} />
    </div>
  );
}
