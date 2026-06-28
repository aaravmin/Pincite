"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateProjectStatus } from "@/lib/projects/actions";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  type ProjectStatus,
} from "@/lib/projects/sections";
import type { StageResult } from "@/lib/stage/detect";

export function StageClient({
  projectId,
  stage,
  declaredStatus,
  applicationNumber,
  filingDate,
}: {
  projectId: string;
  stage: StageResult;
  declaredStatus: ProjectStatus;
  applicationNumber: string | null;
  filingDate: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<ProjectStatus>(declaredStatus);
  const [appNum, setAppNum] = useState(applicationNumber ?? "");
  const [filing, setFiling] = useState(filingDate ?? "");
  const [msg, setMsg] = useState<string | null>(null);

  function save() {
    setMsg(null);
    start(async () => {
      const r = await updateProjectStatus({
        projectId,
        declared_status: status,
        application_number: appNum,
        filing_date: filing || null,
      });
      if ("error" in r) return setMsg(r.error);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Detected stage
      </p>
      <h1
        className="mt-1 text-2xl font-semibold tracking-tight text-foreground"
        data-testid="stage-label"
      >
        {stage.label}
      </h1>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Why
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
            {stage.signals.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            What&apos;s missing to advance
          </p>
          {stage.missing.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Nothing outstanding here.
            </p>
          ) : (
            <ul
              className="mt-1 list-disc space-y-1 pl-4 text-sm text-muted-foreground"
              data-testid="stage-missing"
            >
              {stage.missing.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-border p-4">
        <p className="text-sm font-medium text-foreground">Declared status</p>
        <p className="text-xs text-muted-foreground">
          Set where you are in the lifecycle. Filing details are informational.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="status">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as ProjectStatus)}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PROJECT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="appnum">Application number</Label>
            <Input
              id="appnum"
              value={appNum}
              onChange={(e) => setAppNum(e.target.value)}
              placeholder="optional"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="filing">Filing date</Label>
            <Input
              id="filing"
              type="date"
              value={filing}
              onChange={(e) => setFiling(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Button
            size="sm"
            onClick={save}
            disabled={pending}
            data-testid="save-status-btn"
          >
            {pending ? "Saving…" : "Save status"}
          </Button>
          {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
