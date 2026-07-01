"use client";

// A slim band of the real authorities Pincite pins findings to. It scrolls and
// pauses on hover - a live reminder that every flag resolves to actual MPEP, CFR,
// and statute text. Neutrals only; these are references, not signals.

import { BlurFade } from "@/components/ui/blur-fade";
import { Marquee } from "@/components/ui/marquee";

// All real authorities the product cites across the corpus and validators.
const CITATIONS = [
  "35 U.S.C. 101",
  "35 U.S.C. 102",
  "35 U.S.C. 103",
  "35 U.S.C. 112(a)",
  "35 U.S.C. 112(b)",
  "37 CFR 1.75(c)",
  "37 CFR 1.77",
  "37 CFR 1.84(p)(5)",
  "37 CFR 1.63",
  "MPEP 608.01(n)",
  "MPEP 2106",
  "MPEP 2173.05(b)",
  "MPEP 2173.05(e)",
  "MPEP 2181",
  "MPEP 1503.03",
];

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-lg border bg-card px-3.5 py-1.5 font-mono text-sm text-foreground/80 shadow-sm">
      {label}
    </span>
  );
}

export function CitationMarquee() {
  return (
    <section className="border-t">
      <div className="mx-auto w-full max-w-6xl px-6 py-14">
        <BlurFade inView>
          <p className="text-center text-sm font-medium text-muted-foreground">
            Every flag resolves to real text. A sample of what Pincite pins to.
          </p>
        </BlurFade>
        <div className="relative mt-6 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <Marquee pauseOnHover className="[--duration:38s] [--gap:0.75rem]">
            {CITATIONS.map((c) => (
              <Chip key={c} label={c} />
            ))}
          </Marquee>
        </div>
      </div>
    </section>
  );
}
