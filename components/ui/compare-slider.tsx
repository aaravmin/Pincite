"use client";

// A draggable before/after comparison. `after` is the base and defines the size;
// `before` is layered on top and clipped to the left of the handle. Drag, click,
// or arrow-key the handle to wipe between them. The two nodes must render at the
// same size for the wipe to line up. Pointer + keyboard accessible.

import { useCallback, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export function CompareSlider({
  before,
  after,
  initial = 50,
  ariaLabel = "Reveal the fix",
  className,
}: {
  before: React.ReactNode;
  after: React.ReactNode;
  initial?: number;
  ariaLabel?: string;
  className?: string;
}) {
  const [pos, setPos] = useState(initial);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const update = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const p = ((clientX - r.left) / r.width) * 100;
    setPos(Math.max(0, Math.min(100, p)));
  }, []);

  return (
    <div
      ref={ref}
      className={cn("relative touch-none select-none overflow-hidden rounded-xl", className)}
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e.clientX);
      }}
      onPointerMove={(e) => {
        if (dragging.current) update(e.clientX);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
    >
      {/* after: base layer, defines the height */}
      <div className="pointer-events-none">{after}</div>

      {/* before: overlay, clipped to the left of the handle */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        aria-hidden
      >
        {before}
      </div>

      {/* handle */}
      <div className="absolute inset-y-0" style={{ left: `${pos}%` }} aria-hidden={false}>
        <div className="absolute inset-y-0 w-px -translate-x-1/2 bg-foreground/60" aria-hidden />
        <button
          type="button"
          role="slider"
          aria-label={ariaLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              setPos((p) => Math.max(0, p - 4));
            } else if (e.key === "ArrowRight") {
              e.preventDefault();
              setPos((p) => Math.min(100, p + 4));
            } else if (e.key === "Home") {
              e.preventDefault();
              setPos(0);
            } else if (e.key === "End") {
              e.preventDefault();
              setPos(100);
            }
          }}
          className="absolute top-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border bg-card text-muted-foreground shadow-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
