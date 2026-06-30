"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Eye, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logExport } from "@/lib/export/actions";

type ExportFormat = {
  format: "package" | "docx" | "latex" | "txt";
  label: string;
  testid: string;
};

const FORMATS: ExportFormat[] = [
  { format: "package", label: "Filing package (.zip)", testid: "download-package" },
  { format: "docx", label: "Draft (.docx)", testid: "download-docx" },
  { format: "latex", label: "Patent format (LaTeX .zip)", testid: "download-latex" },
  { format: "txt", label: "Review report (.txt)", testid: "download-txt" },
];

type Preview = {
  format: ExportFormat["format"];
  title: string;
  filename: string;
  note?: string;
  files?: string[];
  content: string;
};

/**
 * The Submission step: the export toolbar plus the report. A file output can be previewed in a
 * half-screen pane (the report shifts to the left half so the toolbar stays clickable) before
 * downloading.
 */
export function ReportWorkspace({
  projectId,
  children,
}: {
  projectId: string;
  children: ReactNode;
}) {
  const [pending, start] = useTransition();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState<ExportFormat["format"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function printPdf() {
    start(async () => {
      await logExport(projectId, "pdf");
      window.print();
    });
  }

  async function openPreview(f: ExportFormat) {
    setError(null);
    setLoading(f.format);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/export?format=${f.format}&preview=1`,
      );
      if (!res.ok) throw new Error(`Preview failed (${res.status})`);
      const data = (await res.json()) as Omit<Preview, "format">;
      setPreview({ ...data, format: f.format });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setLoading(null);
    }
  }

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
                onClick={() => openPreview(f)}
                disabled={loading === f.format}
                data-testid={`preview-${f.format}`}
                aria-label={`Preview ${f.label}`}
                title={`Preview ${f.label}`}
                className="flex items-center gap-1 border-l border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-60"
              >
                <Eye className="size-3.5" aria-hidden />
                {loading === f.format ? "…" : "Preview"}
              </button>
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={printPdf}
            disabled={pending}
            data-testid="print-pdf"
          >
            {pending ? "Preparing…" : "Print to PDF"}
          </Button>
          {error && (
            <span className="text-xs text-muted-foreground" role="status">
              {error}
            </span>
          )}
        </div>

        {children}
      </div>

      {preview && (
        <PreviewPane
          projectId={projectId}
          preview={preview}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}

function PreviewPane({
  projectId,
  preview,
  onClose,
}: {
  projectId: string;
  preview: Preview;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-border bg-background shadow-2xl md:w-1/2 print:hidden"
      role="dialog"
      aria-label={`${preview.title} preview`}
      data-testid="export-preview-pane"
    >
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-foreground">
            {preview.title}
          </h2>
          <p className="truncate text-xs text-muted-foreground">{preview.filename}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild size="sm">
            <a
              href={`/api/projects/${projectId}/export?format=${preview.format}`}
              download
              data-testid="preview-download"
            >
              <Download className="size-3.5" aria-hidden /> Download
            </a>
          </Button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            data-testid="preview-close"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      {preview.note && (
        <p className="border-b border-border px-5 py-2 text-xs text-muted-foreground">
          {preview.note}
        </p>
      )}

      {preview.files && preview.files.length > 0 && (
        <div className="border-b border-border px-5 py-2">
          <p className="mb-1 text-xs font-medium text-foreground">Files in this download</p>
          <ul className="flex flex-wrap gap-1.5">
            {preview.files.map((f) => (
              <li
                key={f}
                className="rounded border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
              >
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex-1 overflow-auto px-5 py-4">
        <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground">
          {preview.content}
        </pre>
      </div>
    </div>
  );
}
