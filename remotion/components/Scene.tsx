import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { display, geist, geistMono } from "../fonts";

// A spot the ambient glow visits, in percent of the frame. `f` is the beat-local
// frame at which the glow is centered on (x, y); between spots it glides with an
// ease-in-out so it dwells on each spot, then travels to the next.
export type HueSpot = { f: number; x: number; y: number };

// Wraps every beat. Sets the app font CSS vars, and maps the shared components'
// font-serif utility to the rounded display face (Baloo 2) so headlines match the
// Pincite wordmark rather than a formal serif. A soft warm-orange glow gives the
// film an ambient hue; each beat routes it along its focal content via `hue`
// waypoints (headline, then whatever the beat is looking at), and a weaker
// counterweight glow mirrors it through the frame center so the warmth stays
// balanced while it moves. Light theme, red for defects only.
export function Scene({
  children,
  className = "",
  hue,
}: {
  children: React.ReactNode;
  className?: string;
  hue?: HueSpot[];
}) {
  const frame = useCurrentFrame();
  let cx = 50;
  let cy = 26;
  if (hue && hue.length > 1) {
    const fs = hue.map((s) => s.f);
    const opts = {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.quad),
    } as const;
    cx = interpolate(frame, fs, hue.map((s) => s.x), opts);
    cy = interpolate(frame, fs, hue.map((s) => s.y), opts);
  } else if (hue && hue.length === 1) {
    cx = hue[0].x;
    cy = hue[0].y;
  }
  // never fully still - a slow breathing drift rides on top of the path
  const gx = cx + 3 * Math.sin(frame / 65);
  const gy = cy + 2.5 * Math.cos(frame / 80);
  return (
    <AbsoluteFill
      className={`bg-background text-foreground ${className}`}
      style={
        {
          "--font-fraunces": display.fontFamily,
          "--font-display": display.fontFamily,
          "--font-geist-sans": geist.fontFamily,
          "--font-geist-mono": geistMono.fontFamily,
          fontFamily: geist.fontFamily,
        } as React.CSSProperties
      }
    >
      {/* ambient warm-orange hue, riding the beat's focal path */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(52% 50% at ${gx}% ${gy}%, rgba(255,138,42,0.16), transparent 72%)`,
        }}
      />
      {/* the counterweight, mirrored through center */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(58% 52% at ${100 - gx}% ${100 - gy}%, rgba(255,168,80,0.09), transparent 70%)`,
        }}
      />
      {children}
    </AbsoluteFill>
  );
}
