"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteAttachment } from "@/lib/filing/actions";
import { DrawingAnalysis } from "@/components/uploads/drawing-analysis";
import type { Attachment, AttachmentKind } from "@/lib/filing/types";

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
              <SelectItem value="drawing">Drawing / figure</SelectItem>
              <SelectItem value="supporting">Supporting document</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          {busy ? "Uploading…" : "Upload file"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp,application/pdf"
          className="sr-only"
          aria-label="Choose a file to upload"
          data-testid="upload-input"
          onChange={onPick}
        />
        <p className="text-xs text-muted-foreground">
          PNG, JPEG, GIF, WEBP, or PDF, up to 25 MB. Stored encrypted in the US.
          Describing a figure sends it to a vision model, so use public or synthetic
          figures only for now.
        </p>
      </div>

      {err && (
        <p className="text-sm text-violation" role="alert">
          {err}
        </p>
      )}

      {initial.length === 0 ? (
        <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {initial.map((a) => (
            <li key={a.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <a
                    href={`/api/projects/${projectId}/attachments/${a.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate font-medium text-foreground hover:underline"
                  >
                    {a.filename}
                  </a>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">
                      {a.kind === "drawing" ? "Drawing" : "Supporting"}
                    </Badge>
                    <span>{fmtSize(a.size_bytes)}</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => remove(a.id)}
                  disabled={pending}
                >
                  Remove
                </Button>
              </div>
              {a.kind === "drawing" && a.mime.startsWith("image/") && (
                <DrawingAnalysis projectId={projectId} attachmentId={a.id} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
