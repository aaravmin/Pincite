"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { restoreVersion, branchVersion } from "@/lib/projects/actions";

export function VersionActions({
  projectId,
  versionId,
}: {
  projectId: string;
  versionId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run(mode: "restore" | "branch") {
    start(async () => {
      const res =
        mode === "restore"
          ? await restoreVersion({ projectId, versionId })
          : await branchVersion({ projectId, versionId });
      if ("error" in res) return;
      router.push(`/projects/${projectId}`);
    });
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => run("restore")}
        title="Open this save into the working draft and keep editing from here"
      >
        Continue from this save
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => run("branch")}
        title="Open this save as a separate copy you can develop in parallel"
      >
        Branch a copy
      </Button>
    </div>
  );
}
