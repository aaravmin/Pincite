"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FilingReadiness } from "@/components/filing/filing-readiness";
import { saveDisclosure } from "@/lib/disclosure/actions";
import {
  DISCLOSURE_FIELDS,
  type Disclosure,
  type DisclosureKey,
} from "@/lib/disclosure/types";
import type { FilingFinding } from "@/lib/validators/filing";

type SaveState = "saved" | "unsaved" | "saving" | "error";
const AUTOSAVE_MS = 1200;
const ALL = "__all__" as const;
type Active = DisclosureKey | typeof ALL;

/**
 * The invention-intake dashboard. Mirrors the draft workspace: a left field nav, a single
 * focused field editor, debounced autosave per field, and an "All fields" view that shows
 * every field together with the cross-reference consistency check and an explicit save.
 */
export function DisclosureWorkspace({
  projectId,
  initial,
  consistency,
}: {
  projectId: string;
  initial: Disclosure;
  consistency: FilingFinding[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<Disclosure>(initial);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const [active, setActive] = useState<Active>(DISCLOSURE_FIELDS[0].key);
  const [status, setStatus] = useState<SaveState>("saved");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saving, startSave] = useTransition();
  const [savedMsg, setSavedMsg] = useState(false);

  const commit = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setStatus("saving");
    const r = await saveDisclosure({ projectId, values: valuesRef.current });
    setStatus("error" in r ? "error" : "saved");
  }, [projectId]);

  function set(key: DisclosureKey, v: string) {
    setValues((p) => ({ ...p, [key]: v }));
    setSavedMsg(false);
    setStatus("unsaved");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void commit(), AUTOSAVE_MS);
  }

  function flush() {
    if (status === "unsaved" || timer.current) void commit();
  }

  function saveAll() {
    setSavedMsg(false);
    startSave(async () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      const r = await saveDisclosure({ projectId, values: valuesRef.current });
      if ("error" in r) {
        setStatus("error");
        return;
      }
      setStatus("saved");
      setSavedMsg(true);
      router.refresh();
    });
  }

  const activeField =
    active === ALL ? null : DISCLOSURE_FIELDS.find((f) => f.key === active)!;

  return (
    <div className="flex min-h-0 flex-1">
      <nav className="w-64 shrink-0 overflow-auto border-r border-border p-3">
        <ul className="space-y-0.5">
          {DISCLOSURE_FIELDS.map((f) => {
            const isActive = active === f.key;
            const filled = (values[f.key] ?? "").trim().length > 0;
            return (
              <li key={f.key}>
                <button
                  type="button"
                  onClick={() => {
                    flush();
                    setActive(f.key);
                  }}
                  aria-current={isActive ? "true" : undefined}
                  className={
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm " +
                    (isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground")
                  }
                >
                  <span className="truncate">{f.label}</span>
                  {filled && (
                    <span
                      className="ml-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/50"
                      aria-hidden
                    />
                  )}
                </button>
              </li>
            );
          })}
          <li className="mt-2 border-t border-border pt-2">
            <button
              type="button"
              onClick={() => {
                flush();
                setActive(ALL);
              }}
              aria-current={active === ALL ? "true" : undefined}
              className={
                "flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-medium " +
                (active === ALL
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground hover:bg-accent/50")
              }
            >
              All fields
            </button>
          </li>
        </ul>
      </nav>

      <main className="flex-1 overflow-auto px-8 py-8">
        <div className="mx-auto max-w-3xl">
          {activeField ? (
            <>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {activeField.label}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeField.hint}
              </p>
              <Textarea
                value={values[activeField.key]}
                onChange={(e) => set(activeField.key, e.target.value)}
                onBlur={flush}
                spellCheck
                aria-label={activeField.label}
                className="mt-4 min-h-[420px] resize-y text-sm leading-relaxed"
                placeholder="Type here, in as much technical detail as you can…"
                data-testid={`disclosure-${activeField.key}`}
              />
              <div className="mt-2 text-xs text-muted-foreground">
                {statusLabel(status)}
              </div>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                All fields
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Your whole disclosure in one place. Review it against your draft, then save.
              </p>
              <div className="mt-6 space-y-6">
                {DISCLOSURE_FIELDS.map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <label
                      htmlFor={`all-${f.key}`}
                      className="text-sm font-medium text-foreground"
                    >
                      {f.label}
                    </label>
                    <p className="text-xs text-muted-foreground">{f.hint}</p>
                    <Textarea
                      id={`all-${f.key}`}
                      value={values[f.key]}
                      onChange={(e) => set(f.key, e.target.value)}
                      onBlur={flush}
                      className="min-h-[120px] resize-y text-sm leading-relaxed"
                      data-testid={`disclosure-${f.key}`}
                    />
                  </div>
                ))}
              </div>

              <section className="mt-8">
                <h2 className="text-sm font-semibold text-foreground">
                  Consistency with your draft
                </h2>
                <div className="mt-3">
                  <FilingReadiness
                    findings={consistency}
                    emptyMessage="Your disclosure lines up with the draft so far."
                  />
                </div>
              </section>

              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-4">
                <Button
                  onClick={saveAll}
                  disabled={saving}
                  data-testid="save-disclosure"
                >
                  {saving ? "Saving…" : "Save disclosure"}
                </Button>
                {savedMsg && (
                  <span className="text-sm text-pass">Disclosure saved</span>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {statusLabel(status)}
                </span>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function statusLabel(s: SaveState): string {
  switch (s) {
    case "saving":
      return "Saving…";
    case "unsaved":
      return "Unsaved changes";
    case "error":
      return "Save failed";
    default:
      return "Saved";
  }
}
