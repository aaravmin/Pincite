"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { analyzeDrawing } from "@/lib/filing/actions";
import type { DrawingReview } from "@/lib/filing/types";

export function DrawingAnalysis({
  projectId,
  attachmentId,
}: {
  projectId: string;
  attachmentId: string;
}) {
  const [pending, start] = useTransition();
  const [review, setReview] = useState<DrawingReview | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function run() {
    setErr(null);
    start(async () => {
      const r = await analyzeDrawing({ projectId, attachmentId });
      if ("error" in r) {
        setReview(null);
        return setErr(r.error);
      }
      setReview(r);
    });
  }

  const imgUrl = `/api/projects/${projectId}/attachments/${attachmentId}`;

  // Number the located findings so the on-figure circle matches the list entry.
  const circleNo = new Map<string, number>();
  if (review) {
    let c = 0;
    for (const f of review.findings) {
      if (f.x !== null && f.y !== null) circleNo.set(f.id, ++c);
    }
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
        {pending ? "Reading the figure…" : "Check drawing (vision)"}
      </Button>
      {err && (
        <p className="mt-2 text-sm text-violation" role="alert">
          {err}
        </p>
      )}

      {review && (
        <div className="mt-2 space-y-4 rounded-md border border-border p-3">
          {/* The figure with red circles on the located issues. */}
          <div className="relative inline-block max-w-full">
            <img
              src={imgUrl}
              alt="Uploaded figure under review"
              className="max-h-[460px] w-auto rounded border border-border"
            />
            {review.findings.map((f) =>
              f.x !== null && f.y !== null ? (
                <span
                  key={f.id}
                  style={{ left: `${f.x * 100}%`, top: `${f.y * 100}%` }}
                  className="absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-violation bg-background/70 text-[11px] font-semibold text-violation"
                  aria-hidden
                >
                  {circleNo.get(f.id)}
                </span>
              ) : null,
            )}
          </div>

          {/* The issues. Red circles point to the located ones; the rest are listed plainly. */}
          {review.findings.length === 0 ? (
            <p className="flex items-center gap-1.5 text-sm text-pass">
              <span className="inline-block size-2.5 rounded-full bg-pass" aria-hidden />
              No drawing issues detected. The figure label and reference numerals look
              consistent with the specification.
            </p>
          ) : (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Drawing issues ({review.findings.length}) - red circles mark the locatable
                spots; whole-figure issues are listed without a circle. Vision estimate, verify.
              </p>
              <ul className="mt-1 space-y-2">
                {review.findings.map((f) => {
                  const n = circleNo.get(f.id);
                  const located = n !== undefined;
                  return (
                    <li
                      key={f.id}
                      className="flex gap-2 rounded-md border border-violation bg-violation-bg p-2 text-sm"
                    >
                      <span
                        className={
                          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold " +
                          (located
                            ? "border-2 border-violation text-violation"
                            : "bg-violation text-background")
                        }
                        aria-hidden
                      >
                        {located ? n : "•"}
                      </span>
                      <span className="min-w-0">
                        <span className="font-medium text-foreground">{f.title}</span>
                        {!located && (
                          <span className="ml-1 rounded bg-violation/15 px-1 text-[10px] font-medium text-violation">
                            whole figure
                          </span>
                        )}
                        {f.detail && (
                          <span className="text-muted-foreground"> {f.detail}</span>
                        )}
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {f.cfr}
                          {f.mpep ? ` · MPEP ${f.mpep}` : ""}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {review.summary && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                What the figure shows
              </p>
              <p className="text-sm text-muted-foreground">{review.summary}</p>
            </div>
          )}

          {review.components.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">
                Each disclosed component should appear in the drawings (37 CFR 1.83).
              </p>
              <ul className="mt-1 space-y-1">
                {review.components.map((c) => (
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
