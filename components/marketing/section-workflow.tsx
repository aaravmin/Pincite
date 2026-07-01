"use client";

// How it works - a numbered vertical timeline of the workflow (draft, check, fix,
// export). Calm and minimal, matching the rest of the page. Few words.

import { BlurFade } from "@/components/ui/blur-fade";

const STEPS = [
  { n: "01", title: "Draft", body: "Write your patent one section at a time." },
  { n: "02", title: "Check", body: "Every rule violation flagged and cited." },
  { n: "03", title: "Fix", body: "Review each fix, then apply it." },
  { n: "04", title: "Export", body: "Filing ready documents in the right format." },
];

export function SectionWorkflow() {
  return (
    <section className="border-t">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-14 px-6 py-24 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10 lg:py-32">
        <BlurFade inView>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            How it works
          </p>
          <h2 className="mt-3 max-w-md text-balance font-rounded text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Draft to filing in four steps.
          </h2>
          <p className="mt-5 max-w-sm text-pretty text-lg leading-relaxed text-muted-foreground">
            No new format to learn. Write, and Pincite handles the rest.
          </p>
        </BlurFade>

        <ol className="relative">
          {STEPS.map((s, i) => (
            <BlurFade key={s.n} inView delay={0.08 * i} className="block">
              <li className="relative flex gap-6 pb-12 last:pb-0">
                {/* rail: dot + connector */}
                <div className="flex flex-col items-center">
                  <span className="mt-1.5 size-4 shrink-0 rounded-full bg-foreground ring-4 ring-foreground/10" aria-hidden />
                  {i < STEPS.length - 1 && <span className="mt-2 w-px flex-1 bg-border" aria-hidden />}
                </div>
                {/* content */}
                <div className="pb-2">
                  <div className="font-rounded text-2xl font-semibold text-muted-foreground/45">{s.n}</div>
                  <h3 className="mt-1 font-rounded text-2xl font-semibold tracking-tight text-foreground">
                    {s.title}
                  </h3>
                  <p className="mt-1.5 max-w-md text-pretty text-lg leading-relaxed text-muted-foreground">
                    {s.body}
                  </p>
                </div>
              </li>
            </BlurFade>
          ))}
        </ol>
      </div>
    </section>
  );
}
