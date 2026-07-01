// Concrete on-palette color values for Remotion shapes and interpolateColors
// (which need literal colors, not CSS vars). These mirror the app's three-signal
// tokens. Red is reserved for rejection and defects, nowhere else.
export const COLORS = {
  violation: "#c81d24", // darkened violation red (matches --violation)
  violationBg: "#fdeceb",
  pass: "#1c7a45", // pass green (matches --pass)
  passBg: "#eaf5ee",
  attention: "#e6b800",
  neutralMarker: "#e4e4e7",
  border: "#d4d4d8",
  foreground: "#0a0a0a",
  mutedForeground: "#6b6b6b",
  background: "#ffffff",
} as const;
