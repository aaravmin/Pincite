"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { analyzeDrawing } from "@/lib/filing/actions";
import type { DrawingReview } from "@/lib/filing/types";

/**
 * Read-only figure review. The old drawing edit/vectorize surface was intentionally removed:
 * uploaded figures stay as their original files, and Pincite only checks and reports issues.
 */
export function DrawingEditor({
  projectId,
  attachmentId,
  filename = "figure",
  mime,
  initialReview = null,
}: {
  projectId: string;
  attachmentId: string;
  filename?: string;
  mime: string;
  initialReview?: DrawingReview | null;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [review, setReview] = useState<DrawingReview | null>(initialReview);
  const [checking, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const imgUrl = `/api/projects/${projectId}/attachments/${attachmentId}?raw=1`;
  const fileUrl = `/api/projects/${projectId}/attachments/${attachmentId}`;
  const visionIssues = review?.findings ?? [];
  const isImage = mime.startsWith("image/");
  const baseName = filename.replace(/\.[^.]+$/, "") || "figure";

  function runCheck() {
    setErr(null);
    start(async () => {
      const r = await analyzeDrawing({ projectId, attachmentId });
      if ("error" in r) return setErr(r.error);
      setReview(r);
    });
  }

  function downloadBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function exportOriginal() {
    const blob = await (await fetch(imgUrl)).blob();
    const ext = filename.split(".").pop()?.toLowerCase() || "png";
    downloadBlob(blob, `${baseName}.${ext}`);
  }

  return (
    <div>
      {isImage ? (
        <img
          ref={imgRef}
          src={imgUrl}
          alt="Uploaded figure"
          className="max-h-[460px] w-auto rounded border border-border"
          draggable={false}
        />
      ) : (
        <iframe
          title={filename}
          src={fileUrl}
          className="h-[520px] w-full rounded border border-border"
        />
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {isImage && (
          <Button
            variant="outline"
            size="sm"
            onClick={runCheck}
            disabled={checking}
            data-testid="describe-drawing"
          >
            {checking
              ? "Reading the figure..."
              : review
                ? "Re-check this figure"
                : "Check this figure"}
          </Button>
        )}
        {isImage && (
          <Button
            variant="outline"
            size="sm"
            onClick={exportOriginal}
            data-testid="export-original"
          >
            Export original
          </Button>
        )}
      </div>

      {err && (
        <p className="mt-2 text-sm text-violation" role="alert">
          {err}
        </p>
      )}

      {isImage && !review && (
        <p className="mt-2 text-xs text-muted-foreground">
          Not checked yet. Checking reads this figure and flags any reference numerals that
          aren&apos;t described in your draft.
        </p>
      )}

      {review && (
        <div className="mt-3 space-y-3">
          {visionIssues.length === 0 ? (
            <p className="flex items-center gap-1.5 text-sm text-pass">
              <span className="inline-block size-2.5 rounded-full bg-pass" aria-hidden />
              No drawing issues found in the last check.
            </p>
          ) : (
            <div>
              <p
                className="text-xs font-medium uppercase text-muted-foreground"
                data-testid="drawing-issue-count"
              >
                Drawing issues ({visionIssues.length})
              </p>
              <ul className="mt-1 space-y-2">
                {visionIssues.map((f) => (
                  <li
                    key={f.id}
                    className="flex gap-2 rounded-md border border-violation bg-violation-bg p-2 text-sm"
                  >
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-violation text-[10px] font-semibold text-background">
                      •
                    </span>
                    <span className="min-w-0">
                      <span className="font-medium text-foreground">{f.title}</span>
                      {f.detail && <span className="text-muted-foreground"> {f.detail}</span>}
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {f.cfr}
                        {f.mpep ? ` · MPEP ${f.mpep}` : ""}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {review.summary && (
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                What the figure shows
              </p>
              <p className="text-sm text-muted-foreground">{review.summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
