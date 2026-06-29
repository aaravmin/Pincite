"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteAttachment } from "@/lib/filing/actions";
import { FigureNavigator } from "@/components/uploads/figure-navigator";
import {
  ATTACHMENT_VIEWS,
  ATTACHMENT_VIEW_LABELS,
  type Attachment,
  type AttachmentKind,
} from "@/lib/filing/types";

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadsPanel({
  projectId,
  initial,
}: {
  projectId: string;
  initial: Attachment[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<AttachmentKind>("drawing");
  const [view, setView] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setErr(null);
    setBusy(true);
    const fd = new FormData();
    fd.append("file", f);
    fd.append("kind", kind);
    fd.append("view", kind === "drawing" ? view : "");
    const res = await fetch(`/api/projects/${projectId}/attachments`, {
      method: "POST",
      body: fd,
    });
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? "Upload failed.");
      return;
    }
    router.refresh();
  }

  function remove(id: string) {
    start(async () => {
      await deleteAttachment({ projectId, attachmentId: id });
      router.refresh();
    });
  }

  const figures = initial.filter((a) => a.kind === "drawing");
  const supporting = initial.filter((a) => a.kind === "supporting");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">File type</span>
          <Select value={kind} onValueChange={(v) => setKind(v as AttachmentKind)}>
            <SelectTrigger className="w-44" aria-label="Attachment type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="drawing">Drawing / figure / 3D</SelectItem>
              <SelectItem value="supporting">Supporting document</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {kind === "drawing" && (
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Orientation</span>
            <Select
              value={view || "none"}
              onValueChange={(v) => setView(v === "none" ? "" : v)}
            >
              <SelectTrigger className="w-44" aria-label="Drawing orientation">
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
          </div>
        )}
        <Button type="button" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? "Uploading…" : "Upload file"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,model/gltf-binary,model/gltf+json,.glb,.gltf"
          className="sr-only"
          aria-label="Choose a file to upload"
          data-testid="upload-input"
          onChange={onPick}
        />
        <p className="max-w-prose text-xs text-muted-foreground">
          Figures upload as PNG, JPEG, GIF, WEBP, or PDF. The USPTO files 2D drawings, so
          these are what go in the package. You can also upload a 3D model (GLB or GLTF) to
          turn and inspect while you draft; it is a visualization aid and is not part of the
          filing. Tag each figure with its view to flip between perspectives. Up to 25 MB,
          stored encrypted in the US. Describing a figure sends it to a vision model, so use
          public or synthetic figures for now.
        </p>
      </div>

      {err && (
        <p className="text-sm text-violation" role="alert">
          {err}
        </p>
      )}

      {figures.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            Figures ({figures.length})
          </h2>
          <FigureNavigator projectId={projectId} figures={figures} />
        </section>
      )}

      {supporting.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            Supporting documents
          </h2>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {supporting.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <a
                  href={`/api/projects/${projectId}/attachments/${a.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate font-medium text-foreground hover:underline"
                >
                  {a.filename}
                </a>
                <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                  <span>{fmtSize(a.size_bytes)}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => remove(a.id)}
                    disabled={pending}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {initial.length === 0 && (
        <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
      )}
    </div>
  );
}
