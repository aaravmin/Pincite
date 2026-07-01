"use client";

// Wraps marketing sections so every motion/react animation (Magic UI included)
// honors the OS reduced-motion setting by snapping to the end state. Pairs with
// the CSS safety net in globals.css and the useReducedMotion guards in the
// shared visuals.

import { MotionConfig } from "motion/react";

export function MarketingMotion({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
