"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { logExport } from "@/lib/export/actions";

export function ReportToolbar({ projectId }: { projectId: string }) {
  const [pending, start] = useTransition();

  function printPdf() {
    start(async () => {
      await logExport(projectId, "pdf");
      window.print();
    });
  }

  return (
    <div className="flex items-center gap-2 border-b border-border px-6 py-3 print:hidden">
      <Button asChild size="sm" variant="outline">
        <a
          href={`/api/projects/${projectId}/export?format=txt`}
          download
          data-testid="download-txt"
        >
          Download TXT
        </a>
      </Button>
      <Button size="sm" onClick={printPdf} disabled={pending} data-testid="print-pdf">
        {pending ? "Preparing…" : "Print to PDF"}
      </Button>
    </div>
  );
}
