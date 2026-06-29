"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteProject } from "@/lib/projects/actions";

/** Admin-only remove control. The server action re-checks the admin email; this just hides
 *  it from everyone else and confirms before the irreversible delete. */
export function DeleteProjectButton({
  projectId,
  name,
}: {
  projectId: string;
  name: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onDelete() {
    if (
      !confirm(
        `Remove "${name}"? This permanently deletes the patent and all of its history.`,
      )
    ) {
      return;
    }
    start(async () => {
      const r = await deleteProject({ projectId });
      if ("error" in r) {
        alert(r.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={pending}
      aria-label={`Remove ${name}`}
      title="Remove patent (admin)"
      className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-violation-bg hover:text-violation disabled:opacity-50"
    >
      <Trash2 className="size-4" aria-hidden />
    </button>
  );
}
