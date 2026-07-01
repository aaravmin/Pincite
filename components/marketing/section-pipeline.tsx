"use client";

// The pipeline. Draft, check, fix, export as connected nodes with motion along
// the path (web-only Animated Beam). The fix step is review and apply, never a
// silent rewrite - human in the loop by design.

import { useRef } from "react";
import { PenLine, ScanLine, Check, FileDown } from "lucide-react";
import { AnimatedBeam } from "@/components/ui/animated-beam";
import { BlurFade } from "@/components/ui/blur-fade";

const NODES = [
  { icon: PenLine, label: "Draft", sub: "plain text, stable offsets" },
  { icon: ScanLine, label: "Check", sub: "rules pinned to real text" },
  { icon: Check, label: "Fix", sub: "review and apply" },
  { icon: FileDown, label: "Export", sub: "filing ready" },
];

export function SectionPipeline() {
  const container = useRef<HTMLDivElement>(null);
  const refs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];

  return (
    <section className="border-t">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 lg:py-28">
        <BlurFade inView>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            The pipeline
          </p>
          <h2 className="mt-3 max-w-2xl font-rounded text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Draft, check, fix, export. One thread.
          </h2>
        </BlurFade>

        <div
          ref={container}
          className="relative mt-14 flex flex-col items-stretch justify-between gap-10 sm:flex-row sm:items-center sm:gap-4"
        >
          {NODES.map((node, i) => {
            const Icon = node.icon;
            return (
              <div key={node.label} className="z-10 flex flex-col items-center text-center">
                <div
                  ref={refs[i]}
                  className="flex size-16 items-center justify-center rounded-2xl border bg-card shadow-sm"
                >
                  <Icon className="size-6 text-foreground" aria-hidden />
                </div>
                <div className="mt-3">
                  <p className="text-sm font-semibold text-foreground">{node.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{node.sub}</p>
                </div>
              </div>
            );
          })}

          {refs.slice(0, -1).map((from, i) => (
            <AnimatedBeam
              key={i}
              containerRef={container}
              fromRef={from}
              toRef={refs[i + 1]}
              duration={5}
              delay={i * 0.6}
              pathColor="var(--border)"
              pathOpacity={1}
              gradientStartColor="var(--foreground)"
              gradientStopColor="var(--muted-foreground)"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
