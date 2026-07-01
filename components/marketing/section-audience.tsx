"use client";

// Who it is for, plus the call to action. Two audiences, one workbench.

import Link from "next/link";
import { User, Briefcase, ArrowRight, Check } from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";

const AUDIENCES = [
  {
    icon: User,
    who: "Pro se inventors",
    blurb: "Draft with guardrails, understand every flag in plain language, and file with confidence.",
    points: ["Guided intake", "Plain language findings", "Filing ready export"],
  },
  {
    icon: Briefcase,
    who: "Patent attorneys",
    blurb: "Catch the preventable defects early across a portfolio, with every flag pinned to its rule.",
    points: ["Portfolio dashboard", "Rule pinned findings", "Audit and versioning"],
  },
];

export function SectionAudience() {
  return (
    <section className="border-t">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 lg:py-28">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {AUDIENCES.map((a, i) => {
            const Icon = a.icon;
            return (
              <BlurFade key={a.who} inView delay={0.1 * i}>
                <div className="flex h-full flex-col rounded-2xl border bg-card p-6 shadow-sm">
                  <span className="flex size-10 items-center justify-center rounded-xl border bg-muted/50 text-foreground">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-serif text-xl font-semibold tracking-tight text-foreground">
                    {a.who}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.blurb}</p>
                  <ul className="mt-4 space-y-2">
                    {a.points.map((pt) => (
                      <li key={pt} className="flex items-center gap-2 text-sm text-foreground">
                        <Check className="size-4 text-pass" aria-hidden />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              </BlurFade>
            );
          })}
        </div>

        {/* final CTA */}
        <BlurFade inView delay={0.15}>
          <div className="mt-14 overflow-hidden rounded-2xl border bg-card px-6 py-12 text-center shadow-sm">
            <h2 className="mx-auto max-w-2xl font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
              See what your draft is hiding.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
              Start a review, watch the flags open into real rules, and export a filing ready set.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Start a review
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <a
                href="#trace"
                className="inline-flex items-center rounded-md border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                See how it works
              </a>
            </div>
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
