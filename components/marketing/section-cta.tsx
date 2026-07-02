import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DotPattern } from "@/components/ui/dot-pattern";
import { SectionEyebrow } from "@/components/marketing/section-eyebrow";
import { LaunchVideo } from "@/components/marketing/launch-video";

/**
 * The calm closing note. One centered card carries the same restrained warm-glow
 * and drawing-sheet dot treatment as the hero, subtler and centered, so the page
 * ends on the brand warmth rather than a loud banner. Presentation only.
 */
export function SectionCta() {
  return (
    <section className="bg-background py-24 lg:py-32">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-3xl border bg-card p-10 text-center sm:p-16">
          {/* the same restrained ambience as the hero, centered and quieter */}
          <DotPattern
            aria-hidden
            width={22}
            height={22}
            cr={1}
            className="pointer-events-none text-foreground/[0.04] [mask-image:radial-gradient(60%_60%_at_50%_40%,black,transparent)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_45%_at_50%_20%,rgba(255,138,42,0.08),transparent_70%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_40%_at_50%_100%,rgba(255,168,80,0.05),transparent_70%)]"
          />

          <div className="relative flex flex-col items-center">
            <SectionEyebrow n="0006">Get started</SectionEyebrow>

            <h2 className="mt-5 font-rounded text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Know before you file
            </h2>

            <p className="mt-5 max-w-md text-pretty text-lg leading-relaxed text-muted-foreground">
              Run your draft through every check before the examiner does.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Start a review
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <LaunchVideo className="rounded-md border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                Watch the demo
              </LaunchVideo>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
