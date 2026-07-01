"use client";

// The WEB driver. It turns "this section scrolled into view" into a progress
// number in [0, 1] that feeds the animation-agnostic visual components. The
// Remotion driver is the other half - it feeds the same prop from useCurrentFrame.
//
// This is the ONLY place a clock lives on the web side. The visuals never call it.

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Reveal a section once it enters the viewport. Returns a ref to attach and a
 * progress number that eases 0 -> 1 over `duration` ms. Honors reduced motion by
 * jumping straight to 1 (fully revealed, no animation).
 */
export function useReveal(options?: {
  amount?: number;
  duration?: number;
  once?: boolean;
  delay?: number;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();
  const inView = useInView(ref, {
    once: options?.once ?? true,
    amount: options?.amount ?? 0.35,
  });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (reduced) {
      setProgress(1);
      return;
    }
    if (!inView) return;
    const duration = options?.duration ?? 900;
    const delay = options?.delay ?? 0;
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now + delay;
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      setProgress(easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, options?.duration, options?.delay]);

  return { ref, progress, inView, reduced };
}

/**
 * Reveal on mount rather than on scroll. For above-the-fold dashboard content
 * (KPI count-ups, the tracker) that is already in view. Honors reduced motion.
 */
export function useMountProgress(duration = 900): number {
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (reduced) {
      setProgress(1);
      return;
    }
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      setProgress(easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, duration]);
  return progress;
}
