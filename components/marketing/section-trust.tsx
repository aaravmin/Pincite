"use client";

// Trust, spelled out. What Pincite does and does not do, in plain language. Calm,
// no color games. These are boundaries, so they read as neutrals, not signals.

import { Scale, Ban, Gauge, BookOpen, Lock, ShieldCheck } from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";
import { AnimatedHeading } from "@/components/marketing/animated-heading";

const ITEMS = [
  {
    icon: Scale,
    title: "Not legal advice",
    body: "A research aid, not a lawyer. You stay responsible for what you file.",
  },
  {
    icon: Ban,
    title: "It never files for you",
    body: "It prepares the documents in the right format. You are the one who files.",
  },
  {
    icon: Gauge,
    title: "No single patentability score",
    body: "Prior art stays broken into pinpoint overlaps. You judge the picture, not a number.",
  },
  {
    icon: BookOpen,
    title: "Every citation resolves to real text",
    body: "Nothing reaches the screen without a rule pinned to the real MPEP or CFR text.",
  },
  {
    icon: Lock,
    title: "Encrypted, US region storage",
    body: "Files are encrypted, stored in a US region, and isolated to your account.",
  },
  {
    icon: ShieldCheck,
    title: "Your work is yours",
    body: "Pincite never sells your data or trains its models on your inventions.",
  },
];

export function SectionTrust() {
  return (
    <section id="trust" className="scroll-mt-20 border-t bg-muted/20">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 lg:py-28">
        <BlurFade inView>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Trust
          </p>
        </BlurFade>
        <AnimatedHeading className="mt-3 max-w-2xl text-balance font-rounded text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
          What Pincite does, and what it does not
        </AnimatedHeading>

        <div className="mt-12 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <BlurFade key={item.title} inView delay={0.05 * i}>
                <div className="flex gap-3">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border bg-card text-muted-foreground">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                  </div>
                </div>
              </BlurFade>
            );
          })}
        </div>
      </div>
    </section>
  );
}
