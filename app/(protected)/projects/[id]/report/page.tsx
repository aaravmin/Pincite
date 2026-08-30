import { HeaderActions } from "@/components/projects/header-actions";
import { notFound } from "next/navigation";
import { buildReportData } from "@/features/exports/application/get-report";
import { ReportView } from "@/features/exports/ui/report-view";
import { ReportWorkspace } from "@/features/exports/ui/report-workspace";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const report = await buildReportData(id);
  if (!report) notFound();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-3 print:hidden">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Export
          </span>
        </div>
        <HeaderActions projectId={id} />
      </header>
      <ReportWorkspace projectId={id}>
        <ReportView report={report} />
      </ReportWorkspace>
    </div>
  );
}
