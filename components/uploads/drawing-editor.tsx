"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { analyzeDrawing, saveDrawingAnnotations } from "@/lib/filing/actions";
import type { DrawingAnnotations, DrawingReview } from "@/lib/filing/types";

const EMPTY: DrawingAnnotations = { labels: [], figureLabel: null };

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));
}

/** Whether a reference numeral appears in the draft text (same test as the server check). */
function describedIn(specLower: string, numeral: string): boolean {
  const esc = numeral.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`).test(specLower);
}

const isNumeral = (t: string) => /^\d+[a-z]?$/i.test(t.trim());

/**
 * The drawing editor (Feature 2). By default it shows the figure with its errors overlaid.
 * "Edit drawing" turns the reference-numeral labels into movable callouts with adjustable
 * lead lines; the issue list recomputes live as you edit (delete an undescribed numeral, or
 * add the figure label, and that error clears on the spot), then Save persists the layer.
 */
export function DrawingEditor({
  projectId,
  attachmentId,
  specText,
  initialReview = null,
  initialAnnotations = null,
}: {
  projectId: string;
  attachmentId: string;
  specText: string;
  initialReview?: DrawingReview | null;
  initialAnnotations?: DrawingAnnotations | null;
}) {
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; kind: "label" | "lead" | "fig" } | null>(null);

  const [review, setReview] = useState<DrawingReview | null>(initialReview);
  const [ann, setAnn] = useState<DrawingAnnotations>(initialAnnotations ?? EMPTY);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [selected, setSelected] = useState<string | null>(null);
  const [checking, start] = useTransition();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const imgUrl = `/api/projects/${projectId}/attachments/${attachmentId}`;
  const specLower = specText.toLowerCase();

  // Numerals on the drawing that the draft never mentions, recomputed from the live layer.
  const undescribed = useMemo(() => {
    const set = new Set<string>();
    for (const l of ann.labels) {
      const t = l.text.trim();
      if (isNumeral(t) && !describedIn(specLower, t)) set.add(l.id);
    }
    return set;
  }, [ann.labels, specLower]);
  const figureMissing = !ann.figureLabel?.text?.trim();

  // Whole-figure / located problems the vision check saw (kept read-only; numeral-not-described
  // and figure-label issues are derived live above, so we drop them here to avoid double count).
  const visionIssues = (review?.findings ?? []).filter((f) =>
    f.id.startsWith("issue-"),
  );

  // Drag the selected label, its lead endpoint, or the figure label while in edit mode.
  useEffect(() => {
    if (mode !== "edit") return;
    function toNorm(e: PointerEvent) {
      const box = boxRef.current?.getBoundingClientRect();
      if (!box || box.width === 0) return { x: 0, y: 0 };
      return {
        x: clamp01((e.clientX - box.left) / box.width),
        y: clamp01((e.clientY - box.top) / box.height),
      };
    }
    function move(e: PointerEvent) {
      const d = dragRef.current;
      if (!d) return;
      const { x, y } = toNorm(e);
      setAnn((prev) => {
        if (d.kind === "fig") {
          return prev.figureLabel
            ? { ...prev, figureLabel: { ...prev.figureLabel, x, y } }
            : prev;
        }
        return {
          ...prev,
          labels: prev.labels.map((l) =>
            l.id === d.id
              ? d.kind === "lead"
                ? { ...l, lead: { x, y } }
                : { ...l, x, y }
              : l,
          ),
        };
      });
    }
    function up() {
      dragRef.current = null;
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [mode]);

  function runCheck() {
    setErr(null);
    start(async () => {
      const r = await analyzeDrawing({ projectId, attachmentId });
      if ("error" in r) return setErr(r.error);
      setReview(r);
      router.refresh(); // picks up the seeded annotation layer
    });
  }

  function enterEdit() {
    setAnn(initialAnnotations ?? ann);
    setMode("edit");
    setSelected(null);
  }
  function cancel() {
    setAnn(initialAnnotations ?? EMPTY);
    setMode("view");
    setSelected(null);
  }
  async function save() {
    setSaving(true);
    setErr(null);
    const r = await saveDrawingAnnotations({ projectId, attachmentId, annotations: ann });
    setSaving(false);
    if ("error" in r) return setErr(r.error);
    setMode("view");
    setSelected(null);
    router.refresh();
  }

  function addNumeral() {
    const t = window.prompt("Reference numeral (for example 12)");
    if (!t || !t.trim()) return;
    const id = `l-${Math.round(performance.now())}-${ann.labels.length}`;
    setAnn((p) => ({
      ...p,
      labels: [...p.labels, { id, text: t.trim().slice(0, 40), x: 0.5, y: 0.5, lead: null }],
    }));
    setSelected(id);
  }
  function editText(id: string) {
    const cur = ann.labels.find((l) => l.id === id);
    const t = window.prompt("Label text", cur?.text ?? "");
    if (t == null) return;
    setAnn((p) => ({
      ...p,
      labels: p.labels.map((l) => (l.id === id ? { ...l, text: t.trim().slice(0, 40) } : l)),
    }));
  }
  function toggleLead(id: string) {
    setAnn((p) => ({
      ...p,
      labels: p.labels.map((l) =>
        l.id === id
          ? { ...l, lead: l.lead ? null : { x: clamp01(l.x + 0.12), y: clamp01(l.y + 0.12) } }
          : l,
      ),
    }));
  }
  function del(id: string) {
    setAnn((p) => ({ ...p, labels: p.labels.filter((l) => l.id !== id) }));
    setSelected(null);
  }
  function addFigureLabel() {
    const t = window.prompt("Figure label (for example FIG. 1)", "FIG. 1");
    if (!t || !t.trim()) return;
    setAnn((p) => ({ ...p, figureLabel: { text: t.trim().slice(0, 40), x: 0.5, y: 0.93 } }));
  }

  const editing = mode === "edit";
  const issueCount = undescribed.size + (figureMissing ? 1 : 0) + visionIssues.length;

  return (
    <div>
      <div
        ref={boxRef}
        className="relative inline-block max-w-full select-none"
        style={{ touchAction: editing ? "none" : undefined }}
      >
        <img
          src={imgUrl}
          alt="Uploaded figure"
          className="max-h-[460px] w-auto rounded border border-border"
          draggable={false}
        />

        {/* Lead lines. */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 size-full"
          aria-hidden
        >
          {ann.labels.map((l) =>
            l.lead ? (
              <line
                key={l.id}
                x1={l.x * 100}
                y1={l.y * 100}
                x2={l.lead.x * 100}
                y2={l.lead.y * 100}
                stroke={undescribed.has(l.id) ? "var(--violation)" : "var(--foreground)"}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ) : null,
          )}
        </svg>

        {/* Numeral labels. */}
        {ann.labels.map((l) => {
          const bad = undescribed.has(l.id);
          const sel = selected === l.id;
          return (
            <button
              key={l.id}
              type="button"
              disabled={!editing}
              onPointerDown={(e) => {
                if (!editing) return;
                dragRef.current = { id: l.id, kind: "label" };
                setSelected(l.id);
                e.currentTarget.setPointerCapture?.(e.pointerId);
              }}
              style={{ left: `${l.x * 100}%`, top: `${l.y * 100}%` }}
              className={
                "absolute flex min-w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 bg-background/80 px-1.5 text-[11px] font-semibold " +
                (bad
                  ? "border-violation text-violation"
                  : "border-foreground text-foreground") +
                (editing ? " cursor-grab active:cursor-grabbing" : "") +
                (sel ? " ring-2 ring-foreground ring-offset-1" : "")
              }
            >
              {l.text || "?"}
            </button>
          );
        })}

        {/* Lead-line endpoint handles (edit mode only). */}
        {editing &&
          ann.labels.map((l) =>
            l.lead ? (
              <span
                key={`h-${l.id}`}
                onPointerDown={(e) => {
                  dragRef.current = { id: l.id, kind: "lead" };
                  setSelected(l.id);
                  (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                }}
                style={{ left: `${l.lead.x * 100}%`, top: `${l.lead.y * 100}%` }}
                className="absolute size-3 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border border-foreground bg-background"
              />
            ) : null,
          )}

        {/* Figure label. */}
        {ann.figureLabel?.text && (
          <button
            type="button"
            disabled={!editing}
            onPointerDown={(e) => {
              if (!editing) return;
              dragRef.current = { id: "fig", kind: "fig" };
              e.currentTarget.setPointerCapture?.(e.pointerId);
            }}
            style={{ left: `${ann.figureLabel.x * 100}%`, top: `${ann.figureLabel.y * 100}%` }}
            className={
              "absolute -translate-x-1/2 -translate-y-1/2 rounded bg-background/80 px-1.5 text-xs font-semibold text-foreground " +
              (editing ? "cursor-grab active:cursor-grabbing" : "")
            }
          >
            {ann.figureLabel.text}
          </button>
        )}
      </div>

      {/* Toolbar. */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {!editing ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={runCheck}
              disabled={checking}
              data-testid="describe-drawing"
            >
              {checking
                ? "Reading the figure…"
                : review
                  ? "Re-check drawing (vision)"
                  : "Check drawing (vision)"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={enterEdit}
              data-testid="edit-drawing"
            >
              Edit drawing
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={addNumeral} data-testid="add-numeral">
              Add numeral
            </Button>
            <Button variant="outline" size="sm" onClick={addFigureLabel} disabled={!figureMissing}>
              Add figure label
            </Button>
            {selected && (
              <>
                <Button variant="outline" size="sm" onClick={() => editText(selected)}>
                  Edit text
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleLead(selected)}>
                  {ann.labels.find((l) => l.id === selected)?.lead
                    ? "Remove lead line"
                    : "Add lead line"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => del(selected)}
                  data-testid="delete-label"
                >
                  Delete
                </Button>
              </>
            )}
            <span className="mx-1 h-5 w-px bg-border" aria-hidden />
            <Button size="sm" onClick={save} disabled={saving} data-testid="save-drawing">
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button variant="outline" size="sm" onClick={cancel} disabled={saving}>
              Cancel
            </Button>
          </>
        )}
      </div>

      {editing && (
        <p className="mt-2 text-xs text-muted-foreground">
          Drag a numeral to reposition it. Select one to edit its text, add or move a lead line
          to the part, or delete it. Issues update as you edit.
        </p>
      )}

      {err && (
        <p className="mt-2 text-sm text-violation" role="alert">
          {err}
        </p>
      )}

      {/* Live issues. */}
      <div className="mt-3 space-y-3">
        {issueCount === 0 ? (
          <p className="flex items-center gap-1.5 text-sm text-pass">
            <span className="inline-block size-2.5 rounded-full bg-pass" aria-hidden />
            No drawing issues. The figure label and reference numerals line up with the draft.
          </p>
        ) : (
          <div>
            <p
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              data-testid="drawing-issue-count"
            >
              Drawing issues ({issueCount})
            </p>
            <ul className="mt-1 space-y-2">
              {[...undescribed].map((id) => {
                const l = ann.labels.find((x) => x.id === id);
                if (!l) return null;
                return (
                  <li
                    key={id}
                    className="flex gap-2 rounded-md border border-violation bg-violation-bg p-2 text-sm"
                  >
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-violation text-[10px] font-semibold text-violation">
                      {l.text}
                    </span>
                    <span className="min-w-0">
                      <span className="font-medium text-foreground">
                        Reference numeral {l.text} not described
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        It is on the drawing but not in your draft. Describe it, or remove it
                        here (37 CFR 1.84(p)).
                      </span>
                    </span>
                  </li>
                );
              })}
              {figureMissing && (
                <li className="flex gap-2 rounded-md border border-violation bg-violation-bg p-2 text-sm">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-violation text-[10px] font-semibold text-background">
                    •
                  </span>
                  <span className="min-w-0">
                    <span className="font-medium text-foreground">No figure label</span>
                    <span className="text-muted-foreground">
                      {" "}
                      Each view must be numbered. Add a label such as FIG. 1 (37 CFR 1.84(u)).
                    </span>
                  </span>
                </li>
              )}
              {visionIssues.map((f) => (
                <li
                  key={f.id}
                  className="flex gap-2 rounded-md border border-violation bg-violation-bg p-2 text-sm"
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-violation text-[10px] font-semibold text-background">
                    •
                  </span>
                  <span className="min-w-0">
                    <span className="font-medium text-foreground">{f.title}</span>
                    {f.detail && <span className="text-muted-foreground"> {f.detail}</span>}
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {f.cfr}
                      {f.mpep ? ` · MPEP ${f.mpep}` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!editing && review?.summary && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              What the figure shows
            </p>
            <p className="text-sm text-muted-foreground">{review.summary}</p>
          </div>
        )}
      </div>
    </div>
  );
}
