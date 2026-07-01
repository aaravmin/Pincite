"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DrawingEditor } from "@/components/uploads/drawing-editor";
import { seedVectorScene, saveVectorScene } from "@/lib/filing/actions";
import { objectTransform } from "@/lib/vector/transform";
import type {
  DrawingAnnotations,
  DrawingReview,
  VectorObject,
  VectorScene,
  VectorSceneMeta,
} from "@/lib/filing/types";

type XY = 0 | 0.5 | 1;
type Handle = { hx: XY; hy: XY };
type Transform = VectorObject["transform"];
type Drag =
  | { kind: "move"; startX: number; startY: number; start: Transform; moved: boolean }
  | { kind: "resize"; handle: Handle; obj: VectorObject; moved: boolean }
  | { kind: "line"; x1: number; y1: number; moved: boolean }
  | null;

// The eight resize handles (corners + edge midpoints); the body itself moves.
const HANDLES: Handle[] = [
  { hx: 0, hy: 0 },
  { hx: 0.5, hy: 0 },
  { hx: 1, hy: 0 },
  { hx: 1, hy: 0.5 },
  { hx: 1, hy: 1 },
  { hx: 0.5, hy: 1 },
  { hx: 0, hy: 1 },
  { hx: 0, hy: 0.5 },
];

/** The object's displayed axis-aligned box (rotation is not exposed for editing). */
function dispRect(bbox: VectorObject["bbox"], t: Transform) {
  const cx = bbox.x + bbox.w / 2;
  const cy = bbox.y + bbox.h / 2;
  return {
    l: cx - (bbox.w / 2) * t.sx + t.tx,
    t: cy - (bbox.h / 2) * t.sy + t.ty,
    r: cx + (bbox.w / 2) * t.sx + t.tx,
    b: cy + (bbox.h / 2) * t.sy + t.ty,
  };
}

/** New transform when a resize handle is dragged to (px,py); the opposite edge stays pinned. */
function computeResize(obj: VectorObject, handle: Handle, px: number, py: number): Transform {
  const { bbox } = obj;
  const cx = bbox.x + bbox.w / 2;
  const cy = bbox.y + bbox.h / 2;
  const d = dispRect(bbox, obj.transform);
  const MIN = 4;
  let { sx, sy, tx, ty } = obj.transform;

  if (handle.hx !== 0.5) {
    const anchorX = handle.hx === 1 ? d.l : d.r;
    const newW = Math.max(MIN, handle.hx === 1 ? px - anchorX : anchorX - px);
    sx = newW / bbox.w;
    const uax = bbox.x + (handle.hx === 1 ? 0 : bbox.w); // opposite (pinned) side, untransformed
    tx = anchorX - cx - (uax - cx) * sx;
  }
  if (handle.hy !== 0.5) {
    const anchorY = handle.hy === 1 ? d.t : d.b;
    const newH = Math.max(MIN, handle.hy === 1 ? py - anchorY : anchorY - py);
    sy = newH / bbox.h;
    const uay = bbox.y + (handle.hy === 1 ? 0 : bbox.h);
    ty = anchorY - cy - (uay - cy) * sy;
  }
  return { tx, ty, sx, sy, rot: obj.transform.rot };
}

/** A new user-drawn straight line (a lead line for something described but not yet drawn). */
function newLine(
  scene: VectorScene,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): VectorObject {
  const r = (n: number) => Math.round(n * 10) / 10;
  const width = Math.max(1.5, Math.round(Math.min(scene.width, scene.height) * 0.0025));
  const maxZ = scene.objects.reduce((m, o) => Math.max(m, o.z), 0);
  return {
    id: `u-${Math.round(performance.now())}-${scene.objects.length}`,
    d: `M${r(x1)} ${r(y1)}L${r(x2)} ${r(y2)}`,
    bbox: {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      w: Math.max(1, Math.abs(x2 - x1)),
      h: Math.max(1, Math.abs(y2 - y1)),
    },
    transform: { tx: 0, ty: 0, sx: 1, sy: 1, rot: 0 },
    hidden: false,
    z: maxZ + 1,
    source: "user",
    fill: "none",
    stroke: { color: "#000000", width },
  };
}

/**
 * All objects except the selected one, rendered once and memoized so a drag never re-renders the
 * whole scene. Hidden objects stay faintly visible (and clickable) so they can be reselected and
 * shown again; they carry a distinct testid and are excluded from export.
 */
const StaticPaths = memo(function StaticPaths({ objects }: { objects: VectorObject[] }) {
  return (
    <>
      {objects.map((o) =>
        o.hidden ? (
          <path
            key={o.id}
            d={o.d}
            transform={objectTransform(o) || undefined}
            fill="none"
            stroke="var(--foreground)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            strokeDasharray="4 3"
            opacity={0.25}
            data-oid={o.id}
            data-testid="scene-object-hidden"
          />
        ) : (
          <path
            key={o.id}
            d={o.d}
            transform={objectTransform(o) || undefined}
            fill={o.fill === "none" ? "none" : "var(--foreground)"}
            fillRule="evenodd"
            stroke={o.stroke ? "var(--foreground)" : undefined}
            strokeWidth={o.stroke?.width}
            data-oid={o.id}
            data-testid="scene-object"
          />
        ),
      )}
    </>
  );
});

/**
 * Two views of an uploaded drawing.
 *   Original - the drawing exactly as uploaded (raster image or PDF), the untouched record.
 *   Edit     - a vectorized copy where every drawn element is a movable/resizable/hideable object.
 * The vector scene is traced on the server on demand (seedVectorScene), edited here, and saved back.
 */
export function VectorDrawingEditor({
  projectId,
  attachmentId,
  filename = "figure",
  mime,
  initialReview = null,
  initialAnnotations = null,
  initialSceneMeta = null,
}: {
  projectId: string;
  attachmentId: string;
  filename?: string;
  mime: string;
  initialReview?: DrawingReview | null;
  initialAnnotations?: DrawingAnnotations | null;
  initialSceneMeta?: VectorSceneMeta | null;
}) {
  const router = useRouter();
  const isPdf = mime === "application/pdf";
  const signedUrl = `/api/projects/${projectId}/attachments/${attachmentId}`;

  const [tab, setTab] = useState<"original" | "edit">("original");
  const [scene, setScene] = useState<VectorScene | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [live, setLive] = useState<Transform | null>(null);
  const [adding, setAdding] = useState(false);
  const [draftEnd, setDraftEnd] = useState<{ x: number; y: number } | null>(null);
  const [history, setHistory] = useState<VectorScene[]>([]);
  const [dirty, setDirty] = useState(false);
  const [loadingScene, setLoadingScene] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [vectorizing, startVectorize] = useTransition();

  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<Drag>(null);
  const sceneRef = useRef<VectorScene | null>(null);
  sceneRef.current = scene;
  const liveRef = useRef<Transform | null>(null);
  liveRef.current = live;
  const draftEndRef = useRef<{ x: number; y: number } | null>(null);
  draftEndRef.current = draftEnd;

  const hasScene = !!initialSceneMeta;
  const selected = scene?.objects.find((o) => o.id === selectedId) ?? null;
  const otherObjects = useMemo(
    () => (scene ? scene.objects.filter((o) => o.id !== selectedId) : []),
    [scene, selectedId],
  );

  const loadScene = useCallback(async () => {
    setLoadingScene(true);
    setErr(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/attachments/${attachmentId}/scene`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Could not load the vector scene.");
      }
      setScene((await res.json()) as VectorScene);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoadingScene(false);
    }
  }, [projectId, attachmentId]);

  useEffect(() => {
    if (tab === "edit" && hasScene && !scene && !loadingScene && !err) void loadScene();
  }, [tab, hasScene, scene, loadingScene, err, loadScene]);

  // Map a pointer position to the SVG user coordinate space (accounts for viewBox scaling).
  const toUser = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }, []);

  const mutate = useCallback((next: VectorScene) => {
    sceneRef.current = next;
    setScene(next);
  }, []);

  const pushHistory = useCallback(() => {
    const cur = sceneRef.current;
    if (cur) setHistory((h) => [...h.slice(-49), cur]);
  }, []);

  const patchSelected = useCallback(
    (patch: Partial<VectorObject>) => {
      const cur = sceneRef.current;
      if (!cur || !selectedId) return;
      pushHistory();
      mutate({
        ...cur,
        objects: cur.objects.map((o) => (o.id === selectedId ? { ...o, ...patch } : o)),
      });
      setDirty(true);
    },
    [selectedId, pushHistory, mutate],
  );

  const removeSelected = useCallback(() => {
    const cur = sceneRef.current;
    if (!cur || !selectedId) return;
    pushHistory();
    mutate({ ...cur, objects: cur.objects.filter((o) => o.id !== selectedId) });
    setSelectedId(null);
    setDirty(true);
  }, [selectedId, pushHistory, mutate]);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      sceneRef.current = prev;
      setScene(prev);
      setDirty(true);
      setLive(null);
      return h.slice(0, -1);
    });
  }, []);

  // Drag lifecycle on the window, active while editing a loaded scene.
  useEffect(() => {
    if (tab !== "edit" || !scene) return;
    function onMove(e: PointerEvent) {
      const d = dragRef.current;
      if (!d) return;
      const { x, y } = toUser(e.clientX, e.clientY);
      if (d.kind === "line") {
        setDraftEnd({ x, y });
      } else if (d.kind === "move") {
        setLive({ ...d.start, tx: d.start.tx + (x - d.startX), ty: d.start.ty + (y - d.startY) });
      } else {
        setLive(computeResize(d.obj, d.handle, x, y));
      }
      d.moved = true;
    }
    function onUp() {
      const d = dragRef.current;
      dragRef.current = null;
      if (!d) return;
      const cur = sceneRef.current;
      if (d.kind === "line") {
        const end = draftEndRef.current;
        setDraftEnd(null);
        if (cur && end && Math.hypot(end.x - d.x1, end.y - d.y1) > 3) {
          pushHistory();
          mutate({ ...cur, objects: [...cur.objects, newLine(cur, d.x1, d.y1, end.x, end.y)] });
          setDirty(true);
        }
        return;
      }
      const t = liveRef.current;
      if (d.moved && cur && selectedId && t) {
        pushHistory();
        mutate({
          ...cur,
          objects: cur.objects.map((o) => (o.id === selectedId ? { ...o, transform: t } : o)),
        });
        setDirty(true);
      }
      setLive(null);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [tab, scene, selectedId, toUser, pushHistory, mutate]);

  // Keyboard: undo, delete selected, deselect.
  useEffect(() => {
    if (tab !== "edit") return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        removeSelected();
      } else if (e.key === "Escape") {
        setSelectedId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab, selectedId, undo, removeSelected]);

  function vectorize() {
    setErr(null);
    startVectorize(async () => {
      const r = await seedVectorScene({ projectId, attachmentId });
      if ("error" in r) {
        setErr(r.error);
        return;
      }
      router.refresh();
    });
  }

  async function save() {
    if (!scene) return;
    setSaving(true);
    setErr(null);
    const r = await saveVectorScene({ projectId, attachmentId, scene });
    setSaving(false);
    if ("error" in r) {
      setErr(r.error);
      return;
    }
    setDirty(false);
    setHistory([]);
    router.refresh();
  }

  // Begin a move by clicking an object (event-delegated from the SVG so every path is selectable
  // without a per-path handler, which would defeat the memoized static layer).
  function beginMove(clientX: number, clientY: number, id: string) {
    const obj = sceneRef.current?.objects.find((o) => o.id === id);
    if (!obj) return;
    setSelectedId(id);
    const { x, y } = toUser(clientX, clientY);
    dragRef.current = { kind: "move", startX: x, startY: y, start: obj.transform, moved: false };
    setLive(obj.transform);
  }

  function onSvgPointerDown(e: React.PointerEvent) {
    if (adding) {
      const { x, y } = toUser(e.clientX, e.clientY);
      dragRef.current = { kind: "line", x1: x, y1: y, moved: false };
      setDraftEnd({ x, y });
      return;
    }
    const oid = (e.target as Element).getAttribute?.("data-oid");
    if (oid) beginMove(e.clientX, e.clientY, oid);
    else setSelectedId(null);
  }

  function toggleAdding() {
    setAdding((v) => !v);
    setSelectedId(null);
    setDraftEnd(null);
  }

  function startResize(e: React.PointerEvent, handle: Handle) {
    e.stopPropagation();
    if (!selected) return;
    dragRef.current = { kind: "resize", handle, obj: selected, moved: false };
    setLive(selected.transform);
  }

  const tabClass = (active: boolean) =>
    `rounded px-3 py-1 text-sm font-medium transition-colors ${
      active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
    }`;

  // Displayed box + handles for the selected object (using the live transform mid-drag).
  const selTransform = selected ? live ?? selected.transform : null;
  const selBox = selected && selTransform ? dispRect(selected.bbox, selTransform) : null;
  const handleSize = scene ? Math.max(5, Math.min(scene.width, scene.height) * 0.012) : 6;

  return (
    <div>
      <div className="mb-3 inline-flex gap-0.5 rounded-md border border-border bg-muted p-0.5">
        <button
          type="button"
          onClick={() => setTab("original")}
          aria-pressed={tab === "original"}
          className={tabClass(tab === "original")}
          data-testid="tab-original"
        >
          Original
        </button>
        <button
          type="button"
          onClick={() => setTab("edit")}
          aria-pressed={tab === "edit"}
          className={tabClass(tab === "edit")}
          data-testid="tab-edit"
        >
          Edit drawing
        </button>
      </div>

      {tab === "original" ? (
        isPdf ? (
          <iframe
            title={filename}
            src={signedUrl}
            className="h-[480px] w-full rounded border border-border"
          />
        ) : (
          <DrawingEditor
            projectId={projectId}
            attachmentId={attachmentId}
            filename={filename}
            initialReview={initialReview}
            initialAnnotations={initialAnnotations}
          />
        )
      ) : (
        <div>
          {err && (
            <p className="mb-2 text-sm text-muted-foreground" role="status">
              {err}
            </p>
          )}

          {!hasScene ? (
            <div className="rounded border border-border p-6 text-center">
              <p className="mb-1 text-sm font-medium">This drawing has not been vectorized yet.</p>
              <p className="mb-4 text-sm text-muted-foreground">
                Turn the drawn lines into objects you can move, resize, hide, or delete.
              </p>
              <Button onClick={vectorize} disabled={vectorizing} data-testid="vectorize">
                {vectorizing ? "Vectorizing..." : "Vectorize this drawing"}
              </Button>
            </div>
          ) : loadingScene || !scene ? (
            <p className="rounded border border-border p-6 text-center text-sm text-muted-foreground">
              Loading the vector scene...
            </p>
          ) : (
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={save} disabled={!dirty || saving} data-testid="scene-save">
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={undo}
                  disabled={history.length === 0}
                  data-testid="scene-undo"
                >
                  Undo
                </Button>
                <Button
                  variant={adding ? "default" : "outline"}
                  size="sm"
                  onClick={toggleAdding}
                  aria-pressed={adding}
                  data-testid="scene-add-line"
                >
                  {adding ? "Done adding" : "Add line"}
                </Button>
                {adding ? (
                  <span className="text-xs text-muted-foreground">
                    Click and drag on the drawing to add a line.
                  </span>
                ) : selected ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => patchSelected({ hidden: !selected.hidden })}
                      data-testid="scene-hide"
                    >
                      {selected.hidden ? "Show" : "Hide"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={removeSelected}
                      data-testid="scene-delete"
                    >
                      Delete
                    </Button>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Click a part to select it, then drag to move or use the handles to resize.
                  </span>
                )}
              </div>

              <div className="overflow-hidden rounded border border-border bg-background">
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${scene.width} ${scene.height}`}
                  className="mx-auto block h-auto w-full touch-none select-none"
                  style={{ maxHeight: 600, cursor: adding ? "crosshair" : undefined }}
                  data-testid="scene-svg"
                  onPointerDown={onSvgPointerDown}
                >
                  <StaticPaths objects={otherObjects} />

                  {adding && draftEnd && dragRef.current?.kind === "line" && (
                    <line
                      x1={dragRef.current.x1}
                      y1={dragRef.current.y1}
                      x2={draftEnd.x}
                      y2={draftEnd.y}
                      stroke="var(--foreground)"
                      strokeWidth={Math.max(1.5, Math.min(scene.width, scene.height) * 0.0025)}
                      pointerEvents="none"
                    />
                  )}

                  {selected && selTransform && (
                    <path
                      d={selected.d}
                      transform={
                        objectTransform({ ...selected, transform: selTransform }) || undefined
                      }
                      fill={selected.hidden || selected.fill === "none" ? "none" : "var(--foreground)"}
                      fillRule="evenodd"
                      stroke="var(--foreground)"
                      strokeWidth={selected.stroke?.width}
                      opacity={selected.hidden ? 0.4 : 1}
                      style={{ cursor: "move" }}
                      data-oid={selected.id}
                      data-testid={selected.hidden ? "scene-object-hidden" : "scene-object"}
                    />
                  )}

                  {selBox && (
                    <g>
                      <rect
                        x={selBox.l}
                        y={selBox.t}
                        width={Math.max(0, selBox.r - selBox.l)}
                        height={Math.max(0, selBox.b - selBox.t)}
                        fill="none"
                        stroke="var(--foreground)"
                        strokeWidth={handleSize / 3}
                        strokeDasharray={`${handleSize} ${handleSize}`}
                        pointerEvents="none"
                      />
                      {HANDLES.map((h) => {
                        const hx = selBox.l + (selBox.r - selBox.l) * h.hx;
                        const hy = selBox.t + (selBox.b - selBox.t) * h.hy;
                        return (
                          <rect
                            key={`${h.hx}-${h.hy}`}
                            x={hx - handleSize / 2}
                            y={hy - handleSize / 2}
                            width={handleSize}
                            height={handleSize}
                            fill="var(--background)"
                            stroke="var(--foreground)"
                            strokeWidth={handleSize / 4}
                            style={{ cursor: "pointer" }}
                            onPointerDown={(e) => startResize(e, h)}
                            data-testid="scene-handle"
                          />
                        );
                      })}
                    </g>
                  )}
                </svg>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {scene.objects.length} objects. Click a part to move, resize, hide, or delete it.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
