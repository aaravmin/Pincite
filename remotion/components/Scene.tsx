import { AbsoluteFill, useCurrentFrame } from "remotion";
import { display, geist, geistMono } from "../fonts";

// Wraps every beat. Sets the app font CSS vars, and maps the shared components'
// font-serif utility to the rounded display face (Baloo 2) so headlines match the
// Pincite wordmark rather than a formal serif. A soft, slowly drifting warm-orange
// glow gives the film an ambient hue. Light theme, red for defects only.
export function Scene({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const frame = useCurrentFrame();
  const gx = 50 + 8 * Math.sin(frame / 110);
  const gy = 26 + 6 * Math.cos(frame / 140);
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
      {/* ambient warm-orange hue */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(52% 50% at ${gx}% ${gy}%, rgba(255,138,42,0.16), transparent 72%)`,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(55% 46% at 88% 94%, rgba(255,168,80,0.10), transparent 70%)",
        }}
      />
      {children}
    </AbsoluteFill>
  );
}
