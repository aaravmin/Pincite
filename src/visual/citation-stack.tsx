"use client";

// The differentiator, as a shared visual. One requirement shown at three levels:
// Law (statute) -> Rule (CFR) -> Guidance (MPEP + plain language). Prop-only, so
// it renders identically in the app's evidence view, on the marketing trace
// section, and in the Remotion video (reveal driven by `progress`).

import { Scale, FileText, BookOpen, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { clamp01, stagger, type Citation } from "./types";

const USPTO_MPEP_BASE = "https://www.uspto.gov/web/offices/pac/mpep/";

type Tier = {
  icon: typeof Scale;
  kicker: string;
  ref: string;
  body: string;
  isMpep?: boolean;
};

export type CitationStackProps = Citation & {
  progress?: number;
  /** when provided, the MPEP tier becomes an in-app "open the real text" button */
  onOpenMpep?: (mpep: string) => void;
  /** static helper line under the stack */
  helperLine?: string;
  /** compact spacing for dense app contexts */
  dense?: boolean;
  className?: string;
};

export function CitationStack({
  law,
  cfr,
  mpep,
  guidance,
  excerpt,
  progress = 1,
  onOpenMpep,
  helperLine = "The same requirement at three levels. The guidance explains the law and the rule.",
  dense,
  className,
}: CitationStackProps) {
  const p = clamp01(progress);
  const tiers: Tier[] = [];
  if (law) tiers.push({ icon: Scale, kicker: "Law", ref: law, body: "The statute that sets the requirement." });
  if (cfr) tiers.push({ icon: FileText, kicker: "Rule", ref: cfr, body: "The regulation that makes it concrete." });
  if (mpep)
    tiers.push({
      icon: BookOpen,
      kicker: "Guidance",
      ref: `MPEP ${mpep}`,
      body: excerpt || guidance,
      isMpep: true,
    });

  return (
    <div className={cn("space-y-2.5", className)}>
      {tiers.map((tier, i) => {
        const tp = stagger(p, i, tiers.length);
        const Icon = tier.icon;
        const clickable = tier.isMpep && onOpenMpep && mpep;
        return (
          <div
            key={tier.kicker}
            style={{ opacity: tp, transform: `translateY(${(1 - tp) * 10}px)` }}
            className={cn(
              "relative rounded-lg border bg-card",
              dense ? "p-3" : "p-3.5",
              // connector line between tiers
              i < tiers.length - 1 &&
                "after:absolute after:left-[27px] after:top-full after:h-2.5 after:w-px after:bg-border",
            )}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/50 text-muted-foreground">
                <Icon className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {tier.kicker}
                  </span>
                  {clickable ? (
                    <button
                      type="button"
                      onClick={() => onOpenMpep!(mpep!)}
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-foreground/80 hover:bg-accent hover:text-foreground"
                    >
                      Open text <ArrowUpRight className="size-3" aria-hidden />
                    </button>
                  ) : tier.isMpep ? (
                    <a
                      href={USPTO_MPEP_BASE}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      USPTO source <ArrowUpRight className="size-3" aria-hidden />
                    </a>
                  ) : null}
                </div>
                <div className="mt-0.5 font-mono text-sm font-medium text-foreground">
                  {tier.ref}
                </div>
                <p className={cn("mt-1 text-sm leading-relaxed text-muted-foreground", dense && "text-[13px]")}>
                  {tier.body}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      {helperLine ? (
        <p
          style={{ opacity: clamp01((p - 0.6) / 0.4) }}
          className="pt-1 text-xs leading-relaxed text-muted-foreground"
        >
          {helperLine}
        </p>
      ) : null}
    </div>
  );
}
