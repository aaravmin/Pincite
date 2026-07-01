"use client";

// Trust, spelled out. What Pincite does and does not do, in plain language. Calm,
// no color games. These are boundaries, so they read as neutrals, not signals.

import { Scale, Ban, Gauge, BookOpen, Lock, ShieldCheck } from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";

const ITEMS = [
  {
    icon: Scale,
    title: "Not legal advice",
    body: "Pincite is a research aid. You stay responsible for what you file and for anything time sensitive.",
  },
  {
    icon: Ban,
    title: "It never files for you",
    body: "Pincite prepares the documents in the right format. You are the one who submits them to the USPTO.",
  },
  {
    icon: Gauge,
    title: "No single patentability score",
    body: "By design. Prior art stays decomposed into pinpoint overlaps, so you judge the picture, not a number.",
  },
  {
    icon: BookOpen,
    title: "Every citation resolves to real text",
    body: "Nothing reaches the screen without a rule that pins to the real MPEP or CFR passage.",
  },
  {
    icon: Lock,
    title: "Encrypted, US region storage",
    body: "Your files are encrypted and stored in a US region, isolated to your account by row level security.",
  },
  {
    icon: ShieldCheck,
    title: "Your work is yours",
    body: "Pincite does not sell your data and does not use your inventions to train its own models.",
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
          <h2 className="mt-3 max-w-2xl font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Serious about the boundaries.
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            A patent workbench earns trust by being honest about what it is and what it is not.
          </p>
        </BlurFade>

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
