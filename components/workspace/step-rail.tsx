"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Step = { key: string; label: string; path: string; tick?: boolean };

// The linear filing flow, combining Pincite's features into a simple step rail.
// review / rules / prior art are review steps (no completion tick).
const STEP_DEFS: { key: string; label: string; sub: string; tickable?: boolean }[] = [
  { key: "draft", label: "Draft", sub: "", tickable: true },
  { key: "disclosure", label: "Disclosure", sub: "disclosure", tickable: true },
  { key: "inventors", label: "Inventors", sub: "inventors", tickable: true },
  { key: "drawings", label: "Drawings", sub: "uploads", tickable: true },
  { key: "review", label: "Review", sub: "review" },
  { key: "rules", label: "Rules", sub: "rules" },
  { key: "priorart", label: "Prior art", sub: "prior-art" },
  { key: "sign", label: "Sign", sub: "sign", tickable: true },
  { key: "submission", label: "Submission", sub: "report", tickable: true },
];

export function StepRail({
  projectId,
  done,
}: {
  projectId: string;
  done: Record<string, boolean>;
}) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const steps: Step[] = STEP_DEFS.map((s) => ({
    key: s.key,
    label: s.label,
    path: s.sub ? `${base}/${s.sub}` : base,
    tick: s.tickable ? !!done[s.key] : undefined,
  }));

  return (
    <nav
      aria-label="Filing steps"
      className="sticky top-0 hidden h-screen w-52 shrink-0 overflow-y-auto border-r border-border bg-secondary/20 p-4 md:block"
    >
      <Link
        href="/dashboard"
        className="mb-3 flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      >
        ← Dashboard
      </Link>
      <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Steps
      </p>
      <ol className="space-y-0.5">
        {steps.map((s, i) => {
          const active = pathname === s.path;
          return (
            <li key={s.key}>
              <Link
                href={s.path}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm ${
                  active
                    ? "bg-accent font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                }`}
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                    s.tick
                      ? "border-pass bg-pass text-pass-foreground"
                      : active
                        ? "border-foreground text-foreground"
                        : "border-border text-muted-foreground"
                  }`}
                  aria-hidden
                >
                  {s.tick ? "✓" : i + 1}
                </span>
                {s.label}
                {s.tick && <span className="sr-only"> (complete)</span>}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
