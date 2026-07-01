// Timing, sizing, and the load-bearing text. One theme, nine out of ten, threaded
// through every beat. 16:9 primary, tighter ~45s cut, headlines in the logo font.

export const FPS = 30;

// 16:9 widescreen is the only cut now (the film was reframed from vertical).
export const SIZE = { width: 1920, height: 1080 };

// Beat lengths in frames (sequence durations; TransitionSeries overlaps ~14f each).
export const BEAT = {
  hook: 300,
  review: 165,
  trace: 270,
  autofix: 205,
  drawings: 215,
  priorart: 205,
  payoff: 255,
} as const;

// Crossfade between beats.
export const XFADE = 14;

// On-screen lines, one idea each. Titles flow, and say the specific thing.
export const LINES = {
  theme: "Nine out of ten patents are rejected",
  themeSub: "Usually over a rule violation that could easily have been caught and fixed",
  themeSub2: "Not because they are unpatentable",
  catch: "Pincite finds them first",
  receipts: "Every violation opens its exact rule",
  autofix: "And proposes the exact fix",
  drawings: "Right down to the numerals on your drawings",
  priorart: "Compared against prior successful patents",
  priorartSub: "So you can prove your invention is genuinely unique",
  payoff: "Then it exports, ready to file to the USPTO",
} as const;
