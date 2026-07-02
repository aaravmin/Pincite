"use client";

import { useEffect, useRef } from "react";

// A single warm hue that travels with the reader down the page. One fixed, very
// low alpha radial (the sanctioned brand orange, never a signal color) whose center
// drifts as scroll progresses, so the whole site shares one moving ambient warmth
// instead of static per section washes. Honors reduced motion by holding still.
export function TravelingHue() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      // gentle horizontal sway, steady drift downward as the reader descends
      const x = 50 + Math.sin(p * Math.PI * 2) * 28;
      const y = 20 + p * 48;
      el.style.setProperty("--hx", `${x}%`);
      el.style.setProperty("--hy", `${y}%`);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[15]"
      style={{ "--hx": "50%", "--hy": "20%" } as React.CSSProperties}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(48% 44% at var(--hx) var(--hy), rgba(255,138,42,0.13), transparent 70%), radial-gradient(50% 44% at calc(100% - var(--hx)) calc(100% - var(--hy)), rgba(255,168,80,0.06), transparent 72%)",
        }}
      />
    </div>
  );
}
