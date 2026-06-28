"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { analyzeDrawing } from "@/lib/filing/actions";

export function DrawingAnalysis({
  projectId,
  attachmentId,
}: {
  projectId: string;
  attachmentId: string;
}) {
  const [pending, start] = useTransition();
  const [desc, setDesc] = useState<string | null>(null);
  const [comps, setComps] = useState<{ name: string; shown: boolean }[]>([]);
  const [err, setErr] = useState<string | null>(null);

  function run() {
    setErr(null);
    start(async () => {
      const r = await analyzeDrawing({ projectId, attachmentId });
      if ("error" in r) return setErr(r.error);
      setDesc(r.description);
      setComps(r.components);
    });
  }

  return (
    <div className="mt-2">
      <Button
        variant="outline"
        size="sm"
        onClick={run}
        disabled={pending}
        data-testid="describe-drawing"
      >
        {pending ? "Reading the figure…" : "Describe & check (vision)"}
      </Button>
      {err && (
        <p className="mt-2 text-sm text-violation" role="alert">
          {err}
        </p>
      )}
      {desc && (
        <div className="mt-2 space-y-2 rounded-md border border-border p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            What the figure shows
          </p>
          <p className="text-sm text-muted-foreground">{desc}</p>
          {comps.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">
                Each disclosed component should appear in the drawings (37 CFR 1.83).
              </p>
              <ul className="mt-1 space-y-1">
                {comps.map((c) => (
                  <li key={c.name} className="flex items-center gap-2 text-sm">
                    <span
                      className={
                        "size-2 shrink-0 rounded-full " +
                        (c.shown ? "bg-pass" : "border border-attention")
                      }
                      aria-hidden
                    />
                    <span
                      className={c.shown ? "text-foreground" : "text-attention-foreground"}
                    >
                      {c.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {c.shown ? "shown" : "not detected in this figure"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
