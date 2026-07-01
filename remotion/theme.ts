// Timing, sizing, and the load-bearing text. One theme, nine out of ten, threaded
// through every beat. 16:9 primary, tighter ~45s cut, headlines in the logo font.

export const FPS = 30;

// 16:9 widescreen is the only cut now (the film was reframed from vertical).
export const SIZE = { width: 1920, height: 1080 };

// Beat lengths in frames (sequence durations; TransitionSeries overlaps ~14f each).
export const BEAT = {
  hook: 300,
  review: 170,
  trace: 255,
  drawings: 215,
  priorart: 200,
  payoff: 250,
} as const;

// Crossfade between beats.
export const XFADE = 14;

// On-screen lines, one idea each.
export const LINES = {
  theme: "Nine out of ten patents are rejected.",
  themeSub: "Usually over something a rule already flags.",
  themeSub2: "Not because it is unpatentable.",
  catch: "Pincite finds them first.",
  receipts: "Every flag opens the exact rule.",
  drawings: "It reads your drawings too.",
  priorart: "It checks the prior art.",
  priorartSub: "So you can prove your invention is genuinely new.",
  payoff: "Then it exports, filing ready.",
} as const;
