"use client";

// The command palette. Keyboard-driven jump to any matter, screen, or action -
// what makes "one place" feel powerful rather than busy. Opens on Cmd/Ctrl K.
// Data is RLS-scoped (listMatters reuses the dashboard query).

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BookText,
  Settings,
  FileText,
  Search,
  ScanLine,
  BookMarked,
  Layers,
  PenLine,
  FileDown,
  ListChecks,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { listMatters } from "@/lib/palette/actions";

type Matter = { id: string; name: string };

export function CommandMenu({
  variant = "sidebar",
  matterId,
}: {
  variant?: "sidebar" | "rail";
  matterId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open && !loaded) {
      setLoaded(true);
      listMatters()
        .then(setMatters)
        .catch(() => setMatters([]));
    }
  }, [open, loaded]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const base = matterId ? `/projects/${matterId}` : "";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md border text-sm text-muted-foreground transition-colors hover:bg-accent",
          variant === "sidebar" ? "px-2.5 py-2" : "px-2.5 py-1.5",
        )}
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="flex-1 text-left">Search</span>
        <kbd className="pointer-events-none hidden rounded border bg-muted px-1.5 font-mono text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} title="Command palette" description="Jump to a matter, screen, or action">
        <CommandInput placeholder="Search matters, screens, and actions" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>

          {matterId ? (
            <CommandGroup heading="This matter">
              <CommandItem onSelect={() => go(`${base}/overview`)}>
                <ListChecks className="size-4" /> Overview
              </CommandItem>
              <CommandItem onSelect={() => go(base)}>
                <FileText className="size-4" /> Draft
              </CommandItem>
              <CommandItem onSelect={() => go(`${base}/review`)}>
                <ScanLine className="size-4" /> Review findings
              </CommandItem>
              <CommandItem onSelect={() => go(`${base}/rules`)}>
                <BookMarked className="size-4" /> Rules
              </CommandItem>
              <CommandItem onSelect={() => go(`${base}/prior-art`)}>
                <Layers className="size-4" /> Prior art
              </CommandItem>
              <CommandItem onSelect={() => go(`${base}/sign`)}>
                <PenLine className="size-4" /> Sign
              </CommandItem>
              <CommandItem onSelect={() => go(`${base}/report`)}>
                <FileDown className="size-4" /> Submission
              </CommandItem>
            </CommandGroup>
          ) : null}

          <CommandGroup heading="Go to">
            <CommandItem onSelect={() => go("/dashboard")}>
              <LayoutDashboard className="size-4" /> Dashboard
              <CommandShortcut>D</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => go("/ask")}>
              <BookText className="size-4" /> Ask the MPEP
            </CommandItem>
            <CommandItem onSelect={() => go("/settings")}>
              <Settings className="size-4" /> Settings
            </CommandItem>
          </CommandGroup>

          {matters.length > 0 ? (
            <CommandGroup heading="Matters">
              {matters.map((m) => (
                <CommandItem
                  key={m.id}
                  value={`matter ${m.name}`}
                  onSelect={() => go(`/projects/${m.id}/overview`)}
                >
                  <FileText className="size-4" /> {m.name}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
}
