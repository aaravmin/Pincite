"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, RotateCcw, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteAttachment,
  analyzeDrawing,
  classifyOrientation,
  setAttachmentView,
} from "@/lib/filing/actions";
import { DrawingAnalysis } from "@/components/uploads/drawing-analysis";
import { ModelViewer } from "@/components/uploads/model-viewer";
import {
  is3dModel,
  ATTACHMENT_VIEWS,
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
  const [checkingAll, setCheckingAll] = useState(false);
  const [allMsg, setAllMsg] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const [viewBusy, setViewBusy] = useState(false);

  const i = Math.min(idx, figures.length - 1);
  const sel = figures[i];
  if (!sel) return null;
  const threeD = is3dModel(sel.mime, sel.filename);
  const isPdf = sel.mime === "application/pdf";
  const url = `/api/projects/${projectId}/attachments/${sel.id}`;

  async function remove() {
    if (!confirm(`Remove "${sel.filename}"?`)) return;
    setPending(true);
    try {
      await deleteAttachment({ projectId, attachmentId: sel.id });
      setIdx(0);
      router.refresh();
    } finally {
      // Always re-enable the button, even after the refresh, so it can be used again.
      setPending(false);
    }
  }

  // Rotate an image figure 90° clockwise: redraw it on a canvas (the browser also bakes in
  // any EXIF orientation), re-upload the corrected bytes, and drop the old one. The stored
  // image is corrected, so both the display and the vision check see it upright; the new
  // copy has no analysis yet, which is correct since rotation invalidates the old one.
  async function rotate(dir: "cw" | "ccw") {
    setRotating(true);
    try {
      const blob = await (await fetch(url)).blob();
      const bmp = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bmp.height;
      canvas.height = bmp.width;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(dir === "cw" ? Math.PI / 2 : -Math.PI / 2);
      ctx.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
      const out: Blob | null = await new Promise((r) =>
        canvas.toBlob((b) => r(b), "image/png"),
      );
      if (!out) return;
      const base = sel.filename.replace(/\.[^.]+$/, "");
      const fd = new FormData();
      fd.append("file", new File([out], `${base}.png`, { type: "image/png" }));
      fd.append("kind", sel.kind);
      fd.append("view", sel.view ?? "");
      const up = await fetch(`/api/projects/${projectId}/attachments`, {
        method: "POST",
        body: fd,
      });
      if (up.ok) {
        await deleteAttachment({ projectId, attachmentId: sel.id });
        setIdx(0);
        router.refresh();
      }
    } finally {
      setRotating(false);
    }
  }

  // Correct the figure's view by hand, or re-run auto-detection on it.
  async function changeView(v: string) {
    setViewBusy(true);
    try {
      await setAttachmentView({
        projectId,
        attachmentId: sel.id,
        view: v === "none" ? "" : v,
      });
      router.refresh();
    } finally {
      setViewBusy(false);
    }
  }
  async function detectView() {
    setViewBusy(true);
    try {
      await classifyOrientation({ projectId, attachmentId: sel.id });
      router.refresh();
    } finally {
      setViewBusy(false);
    }
  }

  // Run the vision check on every uploaded image figure at once (not PDFs or 3D models).
  const imageFigures = figures.filter(
    (f) => !is3dModel(f.mime, f.filename) && f.mime !== "application/pdf",
  );
  async function checkAll() {
    setCheckingAll(true);
    setAllMsg(null);
    let done = 0;
    let failed = 0;
    for (const f of imageFigures) {
      const r = await analyzeDrawing({ projectId, attachmentId: f.id });
      if ("error" in r) failed++;
      else done++;
      setAllMsg(`Checking… ${done + failed}/${imageFigures.length}`);
    }
    setCheckingAll(false);
    setAllMsg(
      `Checked ${done} drawing${done === 1 ? "" : "s"}${
        failed ? `, ${failed} could not be read` : ""
      }.`,
    );
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {imageFigures.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={checkAll}
            disabled={checkingAll}
            data-testid="check-all-drawings"
          >
            {checkingAll
              ? "Checking all…"
              : `Check all drawings (${imageFigures.length})`}
          </Button>
          {allMsg && <span className="text-xs text-muted-foreground">{allMsg}</span>}
        </div>
      )}

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
            {!threeD && !isPdf ? (
              <>
                <Select
                  value={sel.view || "none"}
                  onValueChange={changeView}
                  disabled={viewBusy}
                >
                  <SelectTrigger className="h-7 w-36 text-xs" aria-label="Figure view">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ATTACHMENT_VIEWS.map((v) => (
                      <SelectItem key={v || "none"} value={v || "none"}>
                        {ATTACHMENT_VIEW_LABELS[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={detectView}
                  disabled={viewBusy}
                  className="shrink-0 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-40"
                >
                  {viewBusy ? "Detecting…" : "Detect view"}
                </button>
              </>
            ) : (
              sel.view && (
                <span className="text-xs text-muted-foreground">{viewLabel(sel)}</span>
              )
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
            {!threeD && !isPdf && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => rotate("ccw")}
                  disabled={rotating}
                  title="Rotate left 90°"
                  aria-label="Rotate left"
                >
                  <RotateCcw className="size-4" aria-hidden />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => rotate("cw")}
                  disabled={rotating}
                  title="Rotate right 90°"
                  aria-label="Rotate right"
                >
                  <RotateCw className="size-4" aria-hidden />
                </Button>
              </>
            )}
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
