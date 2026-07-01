import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  interpolateColors,
  spring,
  Img,
  staticFile,
} from "remotion";
import { Scene } from "../components/Scene";
import { KineticText } from "../components/KineticText";
import { COLORS } from "../colors";
import { LINES, END_LINE } from "../theme";

const RECOLOR = [
  "Claim 4 refers to claim 6",
  "Claim 5 dependency form",
  "Reference numerals 14 and 16",
];
const DOCS = ["Specification DOCX", "Application data sheet", "Declaration", "Transmittal", "Fee summary"];

// A compact callback to the opening field: mostly red, one green survivor.
function FieldCallback() {
  const COLS = 9;
  const ROWS = 7;
  const SC = 4;
  const SR = 3;
  const w = 1080;
  const cell = 96;
  const size = 60;
  const gridW = COLS * cell;
  const gridH = ROWS * cell;
  const offX = (w - gridW) / 2;
  return (
    <div style={{ position: "absolute", left: offX, top: 120, width: gridW, height: gridH }}>
      {Array.from({ length: ROWS }).map((_, r) =>
        Array.from({ length: COLS }).map((_, c) => {
          const isSurv = r === SR && c === SC;
          return (
            <div
              key={`${r}-${c}`}
              style={{
                position: "absolute",
                left: c * cell + (cell - size) / 2,
                top: r * cell + (cell - size) / 2,
                width: size,
                height: size,
                borderRadius: 8,
                background: isSurv ? COLORS.pass : COLORS.violation,
                border: isSurv ? `2px solid ${COLORS.foreground}` : "none",
                boxShadow: isSurv ? "0 6px 20px rgba(0,0,0,0.18)" : "none",
              }}
            />
          );
        }),
      )}
    </div>
  );
}

// Beat 4 - the payoff. Findings recolor red to green, the field callback shows the
// one application green among the red, the filing set exports, and the logo lands.
export function Payoff({ width = 1080, height = 1350 }: { width?: number; height?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const aOut = interpolate(frame, [96, 116], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bIn = interpolate(frame, [104, 128], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bOut = interpolate(frame, [186, 206], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cIn = interpolate(frame, [202, 226], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Scene>
      {/* A: recolor + export */}
      <AbsoluteFill style={{ opacity: aOut, padding: "80px" }}>
        <div className="text-center">
          <KineticText
            text={LINES.payoff}
            startFrame={4}
            className="font-serif"
            style={{ fontSize: 56, fontWeight: 600, letterSpacing: "-0.02em", color: COLORS.foreground }}
          />
        </div>
        <div style={{ marginTop: 56, display: "flex", flexDirection: "column", gap: 12 }}>
          {RECOLOR.map((t, i) => {
            const rt = interpolate(frame, [26 + i * 16, 26 + i * 16 + 22], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const dot = interpolateColors(rt, [0, 1], [COLORS.violation, COLORS.pass]);
            return (
              <div key={i} className="flex items-center gap-3 rounded-xl border bg-card p-4">
                <span style={{ width: 12, height: 12, borderRadius: 999, background: dot, display: "inline-block" }} />
                <span className="flex-1 text-[17px] font-medium text-foreground">{t}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: interpolateColors(rt, [0, 1], [COLORS.mutedForeground, COLORS.pass]) }}>
                  {rt > 0.5 ? "Resolved" : "Violation"}
                </span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 44 }} className="grid grid-cols-2 gap-3">
          {DOCS.map((d, i) => {
            const sp = spring({ frame: frame - (54 + i * 8), fps, config: { damping: 200 } });
            return (
              <div
                key={d}
                style={{ opacity: sp, transform: `translateX(${interpolate(sp, [0, 1], [40, 0])}px)` }}
                className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2.5"
              >
                <span style={{ color: COLORS.pass, fontWeight: 700 }}>✓</span>
                <span className="text-[15px] text-muted-foreground">{d}</span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      {/* B: field callback */}
      <AbsoluteFill style={{ opacity: bIn * bOut }}>
        <FieldCallback />
        <AbsoluteFill className="items-center justify-end" style={{ paddingBottom: 200 }}>
          <div className="rounded-full border border-pass bg-pass-bg px-5 py-2 text-[20px] font-medium text-pass">
            One application, filed clean
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

      {/* C: logo + end line */}
      <AbsoluteFill className="items-center justify-center" style={{ opacity: cIn }}>
        <Img src={staticFile("pincite-logo.png")} style={{ height: 96, width: "auto" }} />
        <div className="mt-8">
          <KineticText
            text={END_LINE}
            startFrame={210}
            className="font-serif"
            style={{ fontSize: 52, fontWeight: 600, letterSpacing: "-0.02em", color: COLORS.foreground }}
          />
        </div>
      </AbsoluteFill>
    </Scene>
  );
}
