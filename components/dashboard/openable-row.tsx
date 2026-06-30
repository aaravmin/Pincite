"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  listProjectVersions,
  restoreVersion,
  saveVersion,
} from "@/lib/projects/actions";
import { fmtDateTime } from "@/lib/format";

type V = { id: string; label: string | null; created_at: string };

/**
 * A dashboard matter row that opens on click anywhere except a [data-no-open] control (the
 * delete button). With one save (or none) it opens the matter directly. With more than one it
 * shows a menu of all the saves: click one to open it (the latest opens the matter, an earlier
 * one is reopened into the working draft), or create a new save.
 */
export function OpenableRow({
  projectId,
  versionCount,
  as = "tr",
  className = "",
  children,
}: {
  projectId: string;
  versionCount: number;
  as?: "tr" | "li";
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [menu, setMenu] = useState<{ x: number; y: number; versions: V[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const Tag = as;

  async function activate(e: React.MouseEvent | React.KeyboardEvent) {
    if ((e.target as HTMLElement).closest("[data-no-open]")) return;
    if (versionCount <= 1) {
      router.push(`/projects/${projectId}/overview`);
      return;
    }
    const x = "clientX" in e ? e.clientX : 0;
    const y = "clientY" in e ? e.clientY : 0;
    setBusy(true);
    const versions = await listProjectVersions(projectId);
    setBusy(false);
    if (versions.length <= 1) {
      router.push(`/projects/${projectId}/overview`);
      return;
    }
    setMenu({ x, y, versions });
  }

  async function openVersion(v: V, isLatest: boolean) {
    setMenu(null);
    if (isLatest) {
      router.push(`/projects/${projectId}/overview`);
      return;
    }
    setBusy(true);
    await restoreVersion({ projectId, versionId: v.id });
    setBusy(false);
    router.push(`/projects/${projectId}`);
  }

  async function newSave() {
    setMenu(null);
    setBusy(true);
    await saveVersion({ projectId, label: "New save" });
    setBusy(false);
    router.refresh();
  }

  return (
    <Tag
      className={`cursor-pointer ${className}`}
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === "Enter") activate(e);
      }}
      tabIndex={0}
      aria-busy={busy}
    >
      {children}
      {menu &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-40"
              aria-hidden
              onClick={() => setMenu(null)}
            />
            <div
              role="menu"
              className="fixed z-50 max-h-72 min-w-60 overflow-auto rounded-md border border-border bg-popover p-1 text-sm shadow-md"
              style={{
                left: Math.min(menu.x, window.innerWidth - 260),
                top: Math.min(menu.y, window.innerHeight - 280),
              }}
            >
              <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Open a save
              </p>
              {menu.versions.map((v, i) => (
                <button
                  key={v.id}
                  type="button"
                  role="menuitem"
                  onClick={() => openVersion(v, i === 0)}
                  className="block w-full rounded px-2 py-1.5 text-left hover:bg-accent"
                >
                  <span className="font-medium text-foreground">
                    {v.label || "Untitled save"}
                  </span>
                  {i === 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">latest</span>
                  )}
                  <span className="block text-xs text-muted-foreground">
                    {fmtDateTime(v.created_at)}
                  </span>
                </button>
              ))}
              <div className="my-1 h-px bg-border" aria-hidden />
              <button
                type="button"
                role="menuitem"
                onClick={newSave}
                className="block w-full rounded px-2 py-1.5 text-left text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Create a new save
              </button>
            </div>
          </>,
          document.body,
        )}
    </Tag>
  );
}
