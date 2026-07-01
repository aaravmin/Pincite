// Timing, sizing, and the load-bearing text. One theme, nine out of ten, threaded
// through every beat. 16:9 primary, tighter ~45s cut, headlines in the logo font.

export const FPS = 30;

// 16:9 widescreen is the only cut now (the film was reframed from vertical).
export const SIZE = { width: 1920, height: 1080 };

// 45 seconds at 30fps.
export const DURATION = 1350;

// Beat lengths in frames (sum = DURATION). Tighter, no lingering.
export const BEAT = {
  hook: 210, // 7.0s
  review: 210, // 7.0s
  trace: 270, // 9.0s (hero beat)
  drawings: 240, // 8.0s
  priorart: 210, // 7.0s
  payoff: 210, // 7.0s
} as const;

// On-screen lines, one idea each.
export const LINES = {
  theme: "Nine out of ten patents are rejected.",
  themeSub: "Usually over something a rule already flags.",
  catch: "Pincite finds them first.",
  receipts: "Every flag opens the exact rule.",
  drawings: "It reads your drawings too.",
  priorart: "It checks the prior art.",
  priorartSub: "So you can prove your invention is genuinely new.",
  payoff: "Then it exports, filing ready.",
} as const;
