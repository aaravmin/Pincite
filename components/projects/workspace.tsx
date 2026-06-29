"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { HeaderActions } from "@/components/projects/header-actions";
import { saveSection } from "@/lib/projects/actions";
import {
  SECTION_KEYS,
  SECTION_LABELS,
  SECTION_HINTS,
  ABSTRACT_WORD_LIMIT,
  wordCount,
  type SectionKey,
} from "@/lib/projects/sections";
import type { Project } from "@/lib/projects/types";

type SaveState = "saved" | "unsaved" | "saving" | "error";
const AUTOSAVE_MS = 1200;

export function Workspace({
  project,
  initialSections,
}: {
  project: Project;
  initialSections: Record<string, string>;
}) {
  const seed = useCallback((): Record<SectionKey, string> => {
    const out = {} as Record<SectionKey, string>;
    for (const k of SECTION_KEYS) out[k] = initialSections[k] ?? "";
    return out;
  }, [initialSections]);

  const [sections, setSections] = useState<Record<SectionKey, string>>(seed);
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;

  const searchParams = useSearchParams();
  const initialActive = ((): SectionKey => {
    const s = searchParams.get("section");
    return s && (SECTION_KEYS as readonly string[]).includes(s)
      ? (s as SectionKey)
      : "title";
  })();

  const [active, setActive] = useState<SectionKey>(initialActive);
  const [state, setState] = useState<Record<SectionKey, SaveState>>(
    {} as Record<SectionKey, SaveState>,
  );
  const timers = useRef<Map<SectionKey, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  // Arriving from a review finding (?section&from&to): open that section and select the
  // offending span so the user lands on exactly the text to change.
  const taRef = useRef<HTMLTextAreaElement>(null);
  const focusedRef = useRef(false);
  useEffect(() => {
    if (focusedRef.current || !taRef.current) return;
    const from = Number(searchParams.get("from"));
    const to = Number(searchParams.get("to"));
    if (Number.isFinite(from) && Number.isFinite(to) && to > from) {
      focusedRef.current = true;
      const ta = taRef.current;
      ta.focus();
      try {
        ta.setSelectionRange(from, to);
      } catch {
        /* offsets shifted out of range after an edit; ignore */
      }
    }
  }, [searchParams]);

  const commit = useCallback(
    async (key: SectionKey) => {
      const t = timers.current.get(key);
      if (t) {
        clearTimeout(t);
        timers.current.delete(key);
      }
      setState((s) => ({ ...s, [key]: "saving" }));
      const res = await saveSection({
        projectId: project.id,
        sectionKey: key,
        content: sectionsRef.current[key],
      });
      setState((s) => ({
        ...s,
        [key]: "error" in res ? "error" : "saved",
      }));
    },
    [project.id],
  );

  function onChange(key: SectionKey, value: string) {
    setSections((s) => ({ ...s, [key]: value }));
    setState((s) => ({ ...s, [key]: "unsaved" }));
    const existing = timers.current.get(key);
    if (existing) clearTimeout(existing);
    timers.current.set(
      key,
      setTimeout(() => void commit(key), AUTOSAVE_MS),
    );
  }

  async function switchTo(next: SectionKey) {
    if (next === active) return;
    if (state[active] === "unsaved" || timers.current.has(active)) {
      await commit(active);
    }
    setActive(next);
  }

  const activeStatus = state[active] ?? "saved";
  const activeWords = wordCount(sections[active]);
  const abstractOver = active === "abstract" && activeWords > ABSTRACT_WORD_LIMIT;

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Projects
          </Link>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            {project.name}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-sm text-muted-foreground"
            data-testid="save-status"
          >
            {statusLabel(activeStatus)}
          </span>
          <HeaderActions projectId={project.id} />
        </div>
      </header>

      <div className="flex flex-1">
        <nav className="w-64 shrink-0 border-r border-border p-3">
          <ul className="space-y-0.5">
            {SECTION_KEYS.map((k) => {
              const words = wordCount(sections[k]);
              const isActive = k === active;
              return (
                <li key={k}>
                  <button
                    type="button"
                    onClick={() => void switchTo(k)}
                    aria-current={isActive ? "true" : undefined}
                    className={
                      "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm " +
                      (isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground")
                    }
                  >
                    <span className="truncate">{SECTION_LABELS[k]}</span>
                    {words > 0 && (
                      <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                        {words}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="flex-1 px-8 py-8">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {SECTION_LABELS[active]}
            </h1>
            {SECTION_HINTS[active] && (
              <p className="mt-1 text-sm text-muted-foreground">
                {SECTION_HINTS[active]}
              </p>
            )}
            <Textarea
              ref={taRef}
              value={sections[active]}
              onChange={(e) => onChange(active, e.target.value)}
              onBlur={() => {
                if (state[active] === "unsaved" || timers.current.has(active)) {
                  void commit(active);
                }
              }}
              spellCheck
              aria-label={SECTION_LABELS[active]}
              className="mt-4 min-h-[420px] resize-y font-mono text-sm leading-relaxed"
              placeholder="Type or paste this section…"
              data-testid={`editor-${active}`}
            />
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {statusLabel(activeStatus)}
              </span>
              <span
                className={
                  abstractOver ? "text-attention" : "text-muted-foreground"
                }
              >
                {active === "abstract"
                  ? `${activeWords} / ${ABSTRACT_WORD_LIMIT} words${
                      abstractOver ? " (over limit)" : ""
                    }`
                  : `${activeWords} words`}
              </span>
            </div>
          </div>
        </main>
      </div>
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
