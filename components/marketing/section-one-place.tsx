"use client";

// One place. A bento of the capabilities that matter, each cell holding a small
// live-ish preview rather than a static icon. Only the inline-review cell shows
// the real public flag; the rest are schematic previews of the UI, never
// fabricated analysis.

import {
  ScanLine,
  Layers,
  PenLine,
  FileDown,
  History,
  Route,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BlurFade } from "@/components/ui/blur-fade";
import { AnnotatedEditor } from "@visual/annotated-editor";
import { LifecycleTimeline } from "@visual/lifecycle-timeline";
import { SignalBadge, SignalMark } from "@visual/signal";
import type { VisualSpan } from "@visual/types";

const MINI_CLAIMS =
  "2. The container of claim 1, wherein the base and the lid are formed as one piece.\n" +
  "3. The container of claim 1, wherein the ridges are arranged concentrically.\n" +
  "4. The container of claim 6, wherein the openings comprise a plurality of slots.";
const s = MINI_CLAIMS.indexOf("claim 6");
const MINI_SPANS: VisualSpan[] = [{ start: s, end: s + 7, signal: "red", flagId: "c6" }];

function Cell({
  icon: Icon,
  title,
  blurb,
  children,
  className,
}: {
  icon: typeof ScanLine;
  title: string;
  blurb: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border bg-card p-5 shadow-sm",
        className,
      )}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-md border bg-muted/50 text-muted-foreground">
          <Icon className="size-4" aria-hidden />
        </span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground">{blurb}</p>
      {children ? <div className="mt-4 flex-1">{children}</div> : null}
    </div>
  );
}

export function SectionOnePlace() {
  return (
    <section id="one-place" className="scroll-mt-20 border-t bg-muted/20">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 lg:py-28">
        <BlurFade inView>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            One place
          </p>
          <h2 className="mt-3 max-w-2xl font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            The whole path to filing, in one workbench.
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Draft, check, trace, fix, and export without leaving the page or losing the thread.
          </p>
        </BlurFade>

        <div className="mt-12 grid auto-rows-[minmax(150px,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* feature: inline review */}
          <Cell
            icon={ScanLine}
            title="Inline review"
            blurb="Deterministic checks flag rule violations right on the claim text."
            className="sm:col-span-2 lg:col-span-2"
          >
            <div className="space-y-3">
              <AnnotatedEditor text={MINI_CLAIMS} spans={MINI_SPANS} activeFlagId="c6" caption="Claims" />
              <div className="flex items-center gap-2">
                <SignalBadge signal="red">2 to fix</SignalBadge>
                <SignalBadge signal="yellow">6 to review</SignalBadge>
              </div>
            </div>
          </Cell>

          {/* prior art */}
          <Cell
            icon={Layers}
            title="Prior art overlap"
            blurb="Overlaps pinned to your own claim element, with no single patentability score."
          >
            <div className="space-y-2 rounded-lg border bg-background p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Your claim element</span>
                <span className="font-mono text-foreground">a plurality of ridges</span>
              </div>
              <div className="flex items-center gap-2">
                <SignalMark signal="yellow" />
                <span className="text-muted-foreground">overlapping passage in a prior patent</span>
              </div>
              <div className="flex items-center gap-2">
                <SignalMark signal="red" />
                <span className="text-muted-foreground">full limitation match</span>
              </div>
            </div>
          </Cell>

          {/* drawing check */}
          <Cell
            icon={PenLine}
            title="Drawing check"
            blurb="Reads your figures for reference numerals the specification never introduces."
          >
            <DrawingPreview />
          </Cell>

          {/* export */}
          <Cell
            icon={FileDown}
            title="Filing ready export"
            blurb="The full set, in the order the USPTO expects."
          >
            <ul className="grid grid-cols-2 gap-2 text-xs">
              {["Specification DOCX", "Application data sheet", "Declaration", "Transmittal", "Fee summary", "LaTeX source"].map(
                (d) => (
                  <li key={d} className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1.5">
                    <SignalMark signal="green" />
                    <span className="truncate text-muted-foreground">{d}</span>
                  </li>
                ),
              )}
            </ul>
          </Cell>

          {/* version history + audit */}
          <Cell
            icon={History}
            title="Versions and audit"
            blurb="Every save is an immutable snapshot with a full audit trail."
          >
            <ol className="space-y-2 text-xs">
              {[
                { v: "Save 3", note: "after fixing claim 4" },
                { v: "Save 2", note: "added the abstract" },
                { v: "Save 1", note: "first draft" },
              ].map((row, i) => (
                <li key={row.v} className="flex items-start gap-2">
                  <span className="mt-0.5 flex flex-col items-center">
                    <span className={cn("size-2 rounded-full", i === 0 ? "bg-foreground" : "bg-muted-foreground/40")} />
                  </span>
                  <span>
                    <span className="font-medium text-foreground">{row.v}</span>{" "}
                    <span className="text-muted-foreground">{row.note}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Cell>

          {/* stage tracking */}
          <Cell
            icon={Route}
            title="Stage tracking"
            blurb="Knows where the application stands and what is due next."
            className="sm:col-span-2 lg:col-span-3"
          >
            <div className="rounded-lg border bg-background p-4">
              <LifecycleTimeline currentIndex={1} currentDetail="Filed, awaiting examination" />
            </div>
          </Cell>
        </div>
      </div>
    </section>
  );
}

function DrawingPreview() {
  return (
    <div className="relative rounded-lg border bg-background p-3">
      <svg viewBox="0 0 200 110" className="w-full" role="img" aria-label="Figure with two reference numerals flagged">
        {/* a generic device outline */}
        <rect x="30" y="25" width="140" height="60" rx="8" className="fill-none stroke-muted-foreground/40" strokeWidth={2} />
        <line x1="60" y1="25" x2="60" y2="85" className="stroke-muted-foreground/30" strokeWidth={1.5} />
        <line x1="30" y1="55" x2="170" y2="55" className="stroke-muted-foreground/30" strokeWidth={1.5} />
        {/* leader lines + numerals */}
        <text x="45" y="20" className="fill-muted-foreground text-[9px]">10</text>
        <text x="95" y="20" className="fill-muted-foreground text-[9px]">12</text>
        <text x="150" y="100" className="fill-muted-foreground text-[9px]">14</text>
        <text x="45" y="100" className="fill-muted-foreground text-[9px]">16</text>
        {/* flagged numerals (not introduced in the spec) */}
        <circle cx="153" cy="96" r="11" className="fill-none stroke-violation" strokeWidth={2} />
        <circle cx="48" cy="96" r="11" className="fill-none stroke-violation" strokeWidth={2} />
      </svg>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-violation">
        <SignalMark signal="red" />2 reference numerals not introduced
      </p>
    </div>
  );
}
