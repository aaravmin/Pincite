import { AbsoluteFill } from "remotion";
import { fraunces, geist, geistMono } from "../fonts";

// Wraps every beat: sets the app's font CSS variables so the shared visual
// tokens (font-serif -> --font-fraunces, font-sans, font-mono) resolve, and
// paints the neutral background. Light theme (no .dark class), red for defects.
export function Scene({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AbsoluteFill
      className={`bg-background text-foreground ${className}`}
      style={
        {
          "--font-fraunces": fraunces.fontFamily,
          "--font-geist-sans": geist.fontFamily,
          "--font-geist-mono": geistMono.fontFamily,
          fontFamily: geist.fontFamily,
        } as React.CSSProperties
      }
    >
      {children}
    </AbsoluteFill>
  );
}
