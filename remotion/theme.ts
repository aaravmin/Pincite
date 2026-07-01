// Timing, sizing, and the load-bearing text for the demo. One theme, nine out of
// ten, threaded through every beat. Frame math lives here so beats stay clean.

export const FPS = 30;

// 4:5 for the LinkedIn feed (primary), 16:9 for off-LinkedIn.
export const SIZE_45 = { width: 1080, height: 1350 };
export const SIZE_169 = { width: 1920, height: 1080 };

// 60 seconds at 30fps.
export const DURATION = 1800;

// Beat boundaries in frames [start, end).
export const BEATS = {
  hook: [0, 300], // 0-10s
  review: [300, 660], // 10-22s
  trace: [660, 1140], // 22-38s (hero beat, most room)
  drawings: [1140, 1500], // 38-50s
  payoff: [1500, 1800], // 50-60s
} as const;

export const beatLen = (b: keyof typeof BEATS) => BEATS[b][1] - BEATS[b][0];

// The spine.
export const THEME_LINE = "Nine out of ten patents are rejected.";
export const THEME_SUB = "Usually over something a rule already flags.";
export const END_LINE = "It shows its work.";

// Per-beat on-screen lines (one idea each).
export const LINES = {
  catch: "Pincite finds them first.",
  receipts: "Every flag opens the exact rule.",
  receiptsSub: "Nothing is guessed.",
  drawings: "It reads your drawings too.",
  payoff: "Then it exports, filing ready.",
} as const;

// Sourced stats, "about" framing only.
export const STATS = {
  rejectionRate: "about 9 in 10",
  rejectionCaption: "get a rejection the first time",
  timeline: "about 2 years",
  timelineCaption: "to a decision, on average",
} as const;
