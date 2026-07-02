// V2 cut - a longer film that explains the PROBLEM before the product. Two problems
// made concrete (avoidable clerical mistakes, and the tedious "is this already
// patented" search), then Pincite positioned as automating exactly those tedious
// tasks while never inventing for the user. 16:9, headlines in the logo font.
//
// Timings, sizing, and the load-bearing V2 copy live here. FPS/SIZE are re-imported
// from the base theme so both cuts stay in sync.

export { FPS, SIZE } from "../theme";

// Beat lengths in frames (sequence durations; TransitionSeries overlaps XFADE each).
// Pacing rule (0.4s rest): after a crossfading beat's LAST element has fully,
// visibly settled, the beat sits COMPLETELY STILL - fully composed, nothing
// animating, not yet crossfading - for exactly 12 frames = 0.4s, and only THEN
// begins the XFADE=14 crossfade to the next. Since the crossfade eats the last
// XFADE frames, a beat is static and alone during [lastSettle, D - 14], so
// D = lastSettle + 12 + 14 = lastSettle + 26 for every crossfading beat.
// lastSettle is measured conservatively per element (springs at damping 200 have
// a long tail: settled 30f after their start; KineticText's last word clears
// blur+translate ~30f after its spring starts; an interpolate settles at its end
// frame). The payoff is last (no crossfade after it), so it keeps its own ending
// structure and lingers on the logo ~45+ frames instead. Per-beat lastSettle:
//   hook 289, clerical 182, search 225, positioning 163, review 127, trace 154,
//   autofix 162, drawings 188, priorart 166 -> each + 26 below.
// Two beats settle later than their headline copy: Search's background document
// wall drifts until frame 225 (its drift interpolate ends there), and AutoFix's
// click cursor fades out through frame 162, so those (not the closing line) are
// the true last thing moving and set lastSettle.
export const BEAT = {
  hook: 315,
  clerical: 208,
  search: 251,
  positioning: 189,
  review: 153,
  trace: 180,
  autofix: 188,
  drawings: 214,
  priorart: 192,
  payoff: 305,
} as const;

// Crossfade between beats.
export const XFADE = 14;

// On-screen lines, one idea each. No colons, semicolons, em dashes, or emojis in any
// visible text; headlines carry no trailing period.
export const LINES = {
  // Hook keeps the original theme + qualifier; only the two sublines change.
  theme: "Nine out of ten patents are rejected",
  themeFirst: "on the first application",
  themeSub: "Not because the ideas are bad",
  themeSub2: "Usually for an avoidable formatting or wording mistake",
  // Beat 2 - clerical mistakes made concrete.
  clerical: "Mistakes like these",
  clericalFoot1: "Any one of these can sink the whole application",
  clericalFoot2: "Fixing it after a rejection costs months of waiting",
  // Beat 3 - the tedious prior-art search.
  searchLead: "Then comes one more question",
  searchQuestion: "Has anyone already patented this?",
  searchCaption: "existing US utility patents to check against",
  searchClose: "By hand, that search takes days of reading",
  // Beat 4 - the pivot.
  positioning: "Pincite automates the tedious parts",
  positioningEmph1: "It never invents for you",
  positioningEmph2: "The idea stays yours",
  // Beats 5-10 carry over (with per-beat edits).
  catch: "Pincite finds them first",
  receipts: "Every catch opens the exact rule it breaks",
  receiptsSub: "Quoted from the patent office's own manual",
  autofix: "And proposes the exact fix",
  drawings: "Right down to the numerals on your drawings",
  priorart: "Then it compares your draft to granted patents in seconds",
  priorartSub: "Every line of your draft, checked against existing patents",
  payoff: "Then it exports, ready to file to the USPTO",
} as const;
