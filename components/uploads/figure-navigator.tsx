"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteAttachment } from "@/lib/filing/actions";
import { DrawingAnalysis } from "@/components/uploads/drawing-analysis";
import { ModelViewer } from "@/components/uploads/model-viewer";
import {
  is3dModel,
  ATTACHMENT_VIEW_LABELS,
  type Attachment,
  type AttachmentView,
} from "@/lib/filing/types";

function viewLabel(a: Attachment): string {
  if (a.view) return ATTACHMENT_VIEW_LABELS[a.view as AttachmentView] ?? a.view;
  return is3dModel(a.mime, a.filename) ? "3D model" : "Figure";
}

/** Flip through every figure (images, PDFs, and 3D models) by perspective in one place.
 *  Each view renders by type: an image gets the vision drawing check, a PDF renders inline,
 *  a 3D model gets the orientation toggle. */
export function FigureNavigator({
  projectId,
  figures,
}: {
  projectId: string;
  figures: Attachment[];
}) {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [pending, setPending] = useState(false);

  const i = Math.min(idx, figures.length - 1);
  const sel = figures[i];
  if (!sel) return null;
  const threeD = is3dModel(sel.mime, sel.filename);
  const isPdf = sel.mime === "application/pdf";
  const url = `/api/projects/${projectId}/attachments/${sel.id}`;

  async function remove() {
    if (!confirm(`Remove "${sel.filename}"?`)) return;
    setPending(true);
    await deleteAttachment({ projectId, attachmentId: sel.id });
    setIdx(0);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {/* View tabs - flip between perspectives. */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous view"
          disabled={figures.length < 2}
          onClick={() => setIdx((i - 1 + figures.length) % figures.length)}
          className="shrink-0 rounded-md border border-border p-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <div className="flex flex-1 flex-wrap gap-1.5">
          {figures.map((f, n) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setIdx(n)}
              className={
                "rounded-md border px-2 py-1 text-xs " +
                (n === i
                  ? "border-foreground text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground")
              }
            >
              {n + 1}. {viewLabel(f)}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="Next view"
          disabled={figures.length < 2}
          onClick={() => setIdx((i + 1) % figures.length)}
          className="shrink-0 rounded-md border border-border p-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>

      {/* The selected view. */}
      <div className="rounded-lg border border-border p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span className="truncate font-medium text-foreground">{sel.filename}</span>
            <Badge variant="secondary">
              {threeD ? "3D model" : isPdf ? "PDF" : "Image"}
            </Badge>
            {sel.view && (
              <span className="text-xs text-muted-foreground">{viewLabel(sel)}</span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Open
            </a>
            <Button variant="outline" size="sm" onClick={remove} disabled={pending}>
              Remove
            </Button>
          </div>
        </div>

        <div className="mt-3">
          {threeD ? (
            <ModelViewer key={sel.id} src={`${url}?raw=1`} />
          ) : isPdf ? (
            <iframe
              key={sel.id}
              title={sel.filename}
              src={url}
              className="h-[480px] w-full rounded border border-border"
            />
          ) : (
            <DrawingAnalysis
              key={sel.id}
              projectId={projectId}
              attachmentId={sel.id}
              initialReview={sel.analysis}
            />
          )}
        </div>
      </div>
    </div>
  );
}
