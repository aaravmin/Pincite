"use client";

// Trust, spelled out. What Pincite does and does not do, in plain language. Calm,
// no color games. These are boundaries, so they read as neutrals, not signals.

import { BookOpen, Scale, Lock, ShieldCheck } from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";
import { AnimatedHeading } from "@/components/marketing/animated-heading";
import { SectionEyebrow } from "@/components/marketing/section-eyebrow";

// Four boundaries, one per column. Neutral only, since these are promises, not
// signals. Copy is a single short line each.
const ITEMS = [
  {
    icon: BookOpen,
    title: "Every citation is real",
    body: "Nothing shows without the MPEP or CFR passage behind it.",
  },
  {
    icon: Scale,
    title: "Not legal advice",
    body: "A research aid. What you file stays yours to decide.",
  },
  {
    icon: Lock,
    title: "Encrypted and US based",
    body: "Stored in the US and isolated to your account.",
  },
  {
    icon: ShieldCheck,
    title: "Your work is yours",
    body: "Never sold, never used to train models.",
  },
];

export function SectionTrust() {
  return (
    <section id="trust" className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 lg:py-28">
        <BlurFade inView>
          <SectionEyebrow>Trust</SectionEyebrow>
        </BlurFade>
        <AnimatedHeading className="mt-3 max-w-2xl text-balance font-rounded text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
          What Pincite does, and what it does not
        </AnimatedHeading>

        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <BlurFade key={item.title} inView delay={0.05 * i}>
                <div>
                  <span className="flex size-9 items-center justify-center rounded-lg border bg-card text-muted-foreground">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              </BlurFade>
            );
          })}
        </div>
      </div>
    </section>
  );
}
