"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { saveVersion } from "@/lib/projects/actions";

/**
 * Project-level actions shown on the right of every step header: jump to Stage,
 * Version history, and Audit log, and save an immutable version. Rendered on every
 * workspace step (not just the draft) so the controls are consistent throughout.
 * Save version snapshots the saved state from the database.
 *
 * On the draft itself the editor holds the in-progress text in memory and never autosaves,
 * so a header button here would snapshot stale database content and silently drop the
 * user's edits. The draft therefore passes `showSaveVersion={false}` and offers the one and
 * only save inside the All-sections view, where the live text actually lives.
 */
export function HeaderActions({
  projectId,
  showSaveVersion = true,
}: {
  projectId: string;
  showSaveVersion?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function doSaveVersion() {
    setMsg(null);
    start(async () => {
      const res = await saveVersion({ projectId, label });
      if ("error" in res) {
        setMsg(res.error);
        return;
      }
      setOpen(false);
      setLabel("");
      router.refresh();
    });
  }

  const linkCls = "text-sm text-muted-foreground hover:text-foreground";
  return (
    <div className="flex items-center gap-3">
      <Link href={`/projects/${projectId}/stage`} className={linkCls}>
        Stage
      </Link>
      <Link href={`/projects/${projectId}/versions`} className={linkCls}>
        Version history
      </Link>
      <Link href={`/projects/${projectId}/audit`} className={linkCls}>
        Audit log
      </Link>
      {!showSaveVersion ? null : (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm">Save version</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save a version</DialogTitle>
            <DialogDescription>
              Appends a snapshot; never overwrites a previous save.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="version-label">Label (optional)</Label>
            <Input
              id="version-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. First full draft"
            />
            {msg && (
              <p className="rounded-md bg-muted px-3 py-2 text-sm text-foreground">
                {msg}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button onClick={doSaveVersion} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}
