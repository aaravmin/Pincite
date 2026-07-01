"use client";

// The stake, quantified. Real, sourced statistics counting up on scroll, then the
// interactive map of where rejections come from - every ground routed to the
// Pincite check that catches it. Figures are rounded, sourced from USPTO reporting.

import { NumberTicker } from "@/components/ui/number-ticker";
import { BlurFade } from "@/components/ui/blur-fade";
import { AnimatedHeading } from "@/components/marketing/animated-heading";
import { RejectionExplorer } from "@/components/marketing/rejection-explorer";

function Stat({
  value,
  suffix,
  label,
  decimals = 0,
}: {
  value: number;
  suffix?: string;
  label: string;
  decimals?: number;
}) {
  return (
    <div>
      <div className="text-balance font-rounded text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
        <NumberTicker value={value} decimalPlaces={decimals} className="text-foreground" />
        {suffix ? <span>{suffix}</span> : null}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function SectionStake() {
  return (
    <section className="border-t bg-muted/20">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 lg:py-28">
        <BlurFade inView>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            The stake
          </p>
        </BlurFade>
        <AnimatedHeading className="mt-3 max-w-2xl text-balance font-rounded text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
          Rejection is the default
        </AnimatedHeading>
        <BlurFade inView delay={0.1} className="mt-4">
          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Most applications do not sail through. The average one waits two years and picks up at
            least one rejection along the way. Many of those rejections trace back to rules a careful
            review would have caught.
          </p>
        </BlurFade>

        <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-3">
          <Stat value={700000} label="applications filed a year at the USPTO" />
          <Stat value={11} suffix="%" label="allowed on the first office action" />
          <Stat value={20} label="months, on average, to a first decision" />
        </div>

        <BlurFade inView delay={0.2}>
          <div className="mt-14">
            <RejectionExplorer />
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
