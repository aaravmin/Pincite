// V2 cut - a longer film that explains the PROBLEM before the product. Two problems
// made concrete (avoidable clerical mistakes, and the tedious "is this already
// patented" search), then Pincite positioned as automating exactly those tedious
// tasks while never inventing for the user. 16:9, headlines in the logo font.
//
// Timings, sizing, and the load-bearing V2 copy live here. FPS/SIZE are re-imported
// from the base theme so both cuts stay in sync.

export { FPS, SIZE } from "../theme";

// Beat lengths in frames (sequence durations; TransitionSeries overlaps XFADE each).
// Each length holds the fully composed beat still for ~15 frames after its last
// element lands, before the crossfade to the next - no idle waiting, nothing
// rushed (the payoff, being last, instead lingers on the logo ~47 frames at full
// opacity). Retimed in the pacing pass: every beat's footer / closing line now
// follows promptly after its content lands, so there is no dead air, and the
// static holds were trimmed to the ~15f standard. See the per-beat notes.
export const BEAT = {
  hook: 288,
  clerical: 184,
  search: 208,
  positioning: 164,
  review: 128,
  trace: 156,
  autofix: 176,
  drawings: 204,
  priorart: 182,
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
  themeSub2: "Many over avoidable formatting and wording mistakes",
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
