"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteAttachment } from "@/lib/filing/actions";
import type { Attachment } from "@/lib/filing/types";

/**
 * The operative signature lives on the document the inventor actually signs. Download the
 * declaration (37 CFR 1.63), sign it by hand, and upload the signed copy here so it is kept
 * with the matter. The in-app S-signature is a record of the attestation, not the filing.
 */
export function DeclarationSign({
  projectId,
  signed,
  downloads,
  intro,
}: {
  projectId: string;
  signed: Attachment[];
  downloads: { href: string; label: string }[];
  intro?: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setErr(null);
    setBusy(true);
    const fd = new FormData();
    fd.append("file", f);
    fd.append("kind", "declaration");
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

  async function remove(attachmentId: string) {
    setBusy(true);
    await deleteAttachment({ projectId, attachmentId });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {intro ??
          "The operative signature is the one on the document you file. Download it, sign it, then upload the signed copy here so everything stays in one place. Pincite does not verify the signature."}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {downloads.map((d) => (
          <Button asChild variant="outline" size="sm" key={d.href}>
            <a href={d.href} download data-testid="download-declaration">
              {d.label}
            </a>
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          data-testid="upload-declaration-btn"
        >
          {busy ? "Uploading…" : "Upload signed declaration"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          className="sr-only"
          aria-label="Upload signed declaration"
          data-testid="declaration-input"
          onChange={onPick}
        />
      </div>
      {err && (
        <p className="text-sm text-violation" role="alert">
          {err}
        </p>
      )}
      {signed.length > 0 ? (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {signed.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
            >
              <a
                href={`/api/projects/${projectId}/attachments/${a.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 truncate font-medium text-foreground hover:underline"
              >
                <span className="inline-block size-2.5 rounded-full bg-pass" aria-hidden />
                {a.filename}
              </a>
              <Button
                variant="outline"
                size="sm"
                onClick={() => remove(a.id)}
                disabled={busy}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          No signed declaration uploaded yet.
        </p>
      )}
    </div>
  );
}
