"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { saveSection, saveVersion } from "@/lib/projects/actions";
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
  const router = useRouter();

  const seed = useCallback((): Record<SectionKey, string> => {
    const out = {} as Record<SectionKey, string>;
    for (const k of SECTION_KEYS) out[k] = initialSections[k] ?? "";
    return out;
  }, [initialSections]);

  const [sections, setSections] = useState<Record<SectionKey, string>>(seed);
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;

  const [active, setActive] = useState<SectionKey>("title");
  const [state, setState] = useState<Record<SectionKey, SaveState>>(
    {} as Record<SectionKey, SaveState>,
  );
  const timers = useRef<Map<SectionKey, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

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

  // Save-version dialog state.
  const [versionOpen, setVersionOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [versionMsg, setVersionMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function doSaveVersion() {
    setVersionMsg(null);
    start(async () => {
      if (state[active] === "unsaved" || timers.current.has(active)) {
        await commit(active);
      }
      const res = await saveVersion({ projectId: project.id, label });
      if ("error" in res) {
        setVersionMsg(res.error);
        return;
      }
      setVersionOpen(false);
      setLabel("");
      router.refresh();
    });
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
          <Link
            href={`/projects/${project.id}/stage`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Stage
          </Link>
          <Link
            href={`/projects/${project.id}/review`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Review
          </Link>
          <Link
            href={`/projects/${project.id}/versions`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Version history
          </Link>
          <Link
            href={`/projects/${project.id}/prior-art`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Similar patents
          </Link>
          <Dialog open={versionOpen} onOpenChange={setVersionOpen}>
            <DialogTrigger asChild>
              <Button size="sm">Save version</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save a version</DialogTitle>
                <DialogDescription>
                  Saving appends an immutable snapshot. It never overwrites a
                  previous save.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="version-label">Label (optional)</Label>
                <Input
                  id="version-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. First full draft"
                />
                {versionMsg && (
                  <p className="rounded-md bg-muted px-3 py-2 text-sm text-foreground">
                    {versionMsg}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setVersionOpen(false)}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button onClick={doSaveVersion} disabled={pending}>
                  {pending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
              value={sections[active]}
              onChange={(e) => onChange(active, e.target.value)}
              spellCheck
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
