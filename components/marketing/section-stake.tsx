"use client";

// The stake, quantified. Real, sourced statistics counting up on scroll, plus
// the handful of rules most rejections trace back to - with the one Pincite
// catches marked. Only "about" framing, no invented precision.

import { NumberTicker } from "@/components/ui/number-ticker";
import { BlurFade } from "@/components/ui/blur-fade";
import { SignalMark } from "@visual/signal";

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
      <div className="font-serif text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
        <span className="text-2xl font-normal text-muted-foreground">about </span>
        <NumberTicker value={value} decimalPlaces={decimals} className="text-foreground" />
        {suffix ? <span>{suffix}</span> : null}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

const BASES = [
  { ref: "35 USC 102", name: "Novelty", caught: false },
  { ref: "35 USC 103", name: "Obviousness", caught: false },
  {
    ref: "35 USC 112(b)",
    name: "Indefiniteness and antecedent basis",
    caught: true,
  },
];

export function SectionStake() {
  return (
    <section className="border-t bg-muted/20">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 lg:py-28">
        <BlurFade inView>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            The stake
          </p>
          <h2 className="mt-3 max-w-2xl font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Rejection is the default, not the exception.
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Most applications do not sail through. The average one waits about two years and picks
            up at least one rejection along the way. Many of those rejections trace back to rules a
            careful review would have caught.
          </p>
        </BlurFade>

        <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-3">
          <Stat value={700000} label="applications filed a year at the USPTO" />
          <Stat value={11} suffix="%" label="allowed on the first office action" />
          <Stat value={20} label="months, on average, to a first decision" />
        </div>

        <BlurFade inView delay={0.2}>
          <div className="mt-14 rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="text-sm font-semibold text-foreground">
                Where rejections come from
              </h3>
              <span className="text-xs text-muted-foreground">A handful of rules</span>
            </div>
            <ul className="mt-5 grid gap-3 sm:grid-cols-3">
              {BASES.map((b) => (
                <li
                  key={b.ref}
                  className="rounded-lg border bg-background p-4"
                  data-caught={b.caught || undefined}
                >
                  <div className="flex items-center gap-2">
                    {b.caught ? (
                      <SignalMark signal="red" />
                    ) : (
                      <span className="size-2.5 rounded-full border border-muted-foreground/45" aria-hidden />
                    )}
                    <span className="font-mono text-sm font-medium text-foreground">{b.ref}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">{b.name}</p>
                  {b.caught ? (
                    <p className="mt-2 text-xs font-medium text-violation">
                      Pincite catches this class before you file
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs text-muted-foreground">
              Sources USPTO 2024 filing and pendency reporting, and published allowance and
              rejection basis data. Figures use about language, not exact counts.
            </p>
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
