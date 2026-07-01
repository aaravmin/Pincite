"use client";

import { useState, type ReactNode } from "react";
import { Eye, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ExportFormat = {
  format: "pdf" | "latex" | "package";
  label: string;
  testid: string;
  previewLabel: string;
};

// The patent application as a finished PDF, the editable LaTeX source that produces it, and the
// full filing package you upload to the USPTO. PDF and LaTeX are the same document in two forms,
// so they preview the same rendered pages.
const FORMATS: ExportFormat[] = [
  { format: "pdf", label: "Patent PDF", testid: "download-pdf", previewLabel: "Patent application" },
  {
    format: "latex",
    label: "LaTeX source (.zip)",
    testid: "download-latex",
    previewLabel: "Patent application",
  },
  {
    format: "package",
    label: "Filing package (.zip)",
    testid: "download-package",
    previewLabel: "Filing package",
  },
];

/**
 * The Submission step: the export buttons plus the report. Any export can be previewed in a
 * half-screen pane that shows the application typeset as a PDF (what the LaTeX looks like
 * compiled), rendered by the browser's PDF viewer. The report shifts to the left half so the
 * buttons stay clickable.
 */
export function ReportWorkspace({
  projectId,
  children,
}: {
  projectId: string;
  children: ReactNode;
}) {
  const [preview, setPreview] = useState<ExportFormat | null>(null);
  const previewSrc = preview
    ? `/api/projects/${projectId}/export?format=${preview.format}&preview=1`
    : null;

  return (
    <>
      <div
        className={cn(
          "transition-[margin] duration-200 print:!mr-0",
          preview && "md:mr-[50%]",
        )}
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-3 print:hidden">
          {FORMATS.map((f) => (
            <div
              key={f.format}
              className="flex items-center overflow-hidden rounded-md border border-border"
            >
              <a
                href={`/api/projects/${projectId}/export?format=${f.format}`}
                download
                data-testid={f.testid}
                className="px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                {f.label}
              </a>
              <button
                type="button"
                onClick={() => setPreview(f)}
                data-testid={`preview-${f.format}`}
                aria-label={`Preview ${f.label}`}
                title={`Preview ${f.label}`}
                className={cn(
                  "flex items-center gap-1 border-l border-border px-2.5 py-1.5 text-xs hover:bg-muted hover:text-foreground",
                  preview?.format === f.format
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground",
                )}
              >
                <Eye className="size-3.5" aria-hidden />
                Preview
              </button>
            </div>
          ))}
        </div>

        {children}
      </div>

      {preview && previewSrc && (
        <div
          className="fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-border bg-background shadow-2xl md:w-1/2 print:hidden"
          role="dialog"
          aria-label={`${preview.previewLabel} preview`}
          data-testid="export-preview-pane"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
            <h2 className="truncate text-sm font-semibold text-foreground">
              {preview.previewLabel}
            </h2>
            <div className="flex shrink-0 items-center gap-2">
              <Button asChild size="sm">
                <a
                  href={`/api/projects/${projectId}/export?format=${preview.format}`}
                  download
                  data-testid="preview-download"
                >
                  <Download className="size-3.5" aria-hidden /> Download {preview.label}
                </a>
              </Button>
              <button
                type="button"
                onClick={() => setPreview(null)}
                aria-label="Close preview"
                data-testid="preview-close"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          </div>
          <iframe
            key={previewSrc}
            src={previewSrc}
            title={`${preview.previewLabel} preview`}
            data-testid="export-preview-frame"
            className="h-full w-full flex-1 bg-muted"
          />
        </div>
      )}
    </>
  );
}
