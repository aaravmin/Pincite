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
import { LINES } from "../theme";

const RECOLOR = [
  "Claim 4 refers to claim 6",
  "Claim 5 dependency form",
  "Reference numerals 108, 203, 216, 224",
];
const DOCS = ["Specification DOCX", "Application data sheet", "Declaration", "Transmittal", "Fee summary", "LaTeX source"];

// A wide callback to the opening field: mostly red, one green survivor.
function FieldCallback({ width = 1920, height = 1080 }: { width?: number; height?: number }) {
  const COLS = 16;
  const ROWS = 8;
  const SC = 8;
  const SR = 3;
  const cell = 96;
  const size = 62;
  const gridW = COLS * cell;
  const gridH = ROWS * cell;
  const offX = (width - gridW) / 2;
  const offY = (height - gridH) / 2;
  return (
    <div style={{ position: "absolute", left: offX, top: offY, width: gridW, height: gridH }}>
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

// Beat 5 - the payoff. Findings recolor red to green, the filing set exports, the
// field callback shows the one application green among the red, and the logo lands.
export function Payoff({ width = 1920, height = 1080 }: { width?: number; height?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const aOut = interpolate(frame, [78, 98], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bIn = interpolate(frame, [86, 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bOut = interpolate(frame, [150, 170], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cIn = interpolate(frame, [166, 192], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const logoT = spring({ frame: frame - 168, fps, config: { damping: 200 } });

  return (
    <Scene>
      {/* A: recolor + export */}
      <AbsoluteFill style={{ opacity: aOut, padding: "64px 100px" }}>
        <div className="text-center">
          <KineticText
            text={LINES.payoff}
            startFrame={4}
            className="font-serif"
            style={{ fontSize: 66, fontWeight: 700, color: COLORS.foreground }}
          />
        </div>
        <div style={{ marginTop: 48, display: "flex", gap: 44, alignItems: "flex-start" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
            {RECOLOR.map((t, i) => {
              const rt = interpolate(frame, [22 + i * 14, 22 + i * 14 + 22], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const dot = interpolateColors(rt, [0, 1], [COLORS.violation, COLORS.pass]);
              return (
                <div key={i} className="flex items-center gap-3 rounded-xl border bg-card p-4">
                  <span style={{ width: 13, height: 13, borderRadius: 999, background: dot, display: "inline-block" }} />
                  <span className="flex-1 text-[18px] font-medium text-foreground">{t}</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: interpolateColors(rt, [0, 1], [COLORS.mutedForeground, COLORS.pass]) }}>
                    {rt > 0.5 ? "Resolved" : "Violation"}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ flex: 1 }} className="grid grid-cols-2 gap-3">
            {DOCS.map((d, i) => {
              const sp = spring({ frame: frame - (50 + i * 7), fps, config: { damping: 200 } });
              return (
                <div
                  key={d}
                  style={{ opacity: sp, transform: `translateX(${interpolate(sp, [0, 1], [40, 0])}px)` }}
                  className="flex items-center gap-2 rounded-lg border bg-background px-3 py-3"
                >
                  <span style={{ color: COLORS.pass, fontWeight: 700 }}>✓</span>
                  <span className="text-[16px] text-muted-foreground">{d}</span>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>

      {/* B: field callback */}
      <AbsoluteFill style={{ opacity: bIn * bOut }}>
        <FieldCallback width={width} height={height} />
        <AbsoluteFill className="items-center justify-end" style={{ paddingBottom: 90 }}>
          <div className="rounded-full border border-pass bg-pass-bg px-6 py-2.5 text-[22px] font-medium text-pass">
            One application, filed clean
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

      {/* C: logo only */}
      <AbsoluteFill className="items-center justify-center" style={{ opacity: cIn }}>
        <Img
          src={staticFile("pincite-logo.png")}
          style={{ height: 150, width: "auto", transform: `scale(${interpolate(logoT, [0, 1], [0.9, 1])})` }}
        />
      </AbsoluteFill>
    </Scene>
  );
}
