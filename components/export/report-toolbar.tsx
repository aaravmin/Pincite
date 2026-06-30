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
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-3 print:hidden">
      <Button asChild size="sm">
        <a
          href={`/api/projects/${projectId}/export?format=package`}
          download
          data-testid="download-package"
        >
          Download filing package (.zip)
        </a>
      </Button>
      <Button asChild size="sm" variant="outline">
        <a
          href={`/api/projects/${projectId}/export?format=docx`}
          download
          data-testid="download-docx"
        >
          Draft (.docx)
        </a>
      </Button>
      <Button asChild size="sm" variant="outline">
        <a
          href={`/api/projects/${projectId}/export?format=latex`}
          download
          data-testid="download-latex"
        >
          Patent format (LaTeX .zip)
        </a>
      </Button>
      <Button asChild size="sm" variant="outline">
        <a
          href={`/api/projects/${projectId}/export?format=txt`}
          download
          data-testid="download-txt"
        >
          Review report (.txt)
        </a>
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={printPdf}
        disabled={pending}
        data-testid="print-pdf"
      >
        {pending ? "Preparing…" : "Print to PDF"}
      </Button>
    </div>
  );
}
