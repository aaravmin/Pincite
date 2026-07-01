import { AbsoluteFill } from "remotion";
import { display, geist, geistMono } from "../fonts";

// Wraps every beat. Sets the app font CSS vars, and maps the shared components'
// font-serif utility to the rounded display face (Baloo 2) so headlines match the
// Pincite wordmark rather than a formal serif. Light theme, red for defects only.
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
          "--font-fraunces": display.fontFamily,
          "--font-display": display.fontFamily,
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
