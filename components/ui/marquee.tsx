"use client";

// A minimal Magic UI style marquee. Content scrolls horizontally and pauses on
// hover. Honors reduced motion by rendering a static wrapped row (never the loop's
// broken end state), independent of the global reduced-motion CSS override.

import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

interface MarqueeProps extends React.ComponentPropsWithoutRef<"div"> {
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  children: React.ReactNode;
  /** number of times the children are repeated to fill and loop the track */
  repeat?: number;
}

export function Marquee({
  className,
  reverse = false,
  pauseOnHover = true,
  children,
  repeat = 3,
  ...props
}: MarqueeProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <div className={cn("flex flex-wrap justify-center gap-3", className)} {...props}>
        {children}
      </div>
    );
  }

  return (
    <div
      {...props}
      className={cn(
        "group flex flex-row overflow-hidden p-2 [--duration:40s] [--gap:1rem] [gap:var(--gap)]",
        className,
      )}
    >
      {Array.from({ length: repeat }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex shrink-0 flex-row justify-around [gap:var(--gap)] animate-marquee",
            pauseOnHover && "group-hover:[animation-play-state:paused]",
            reverse && "[animation-direction:reverse]",
          )}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
