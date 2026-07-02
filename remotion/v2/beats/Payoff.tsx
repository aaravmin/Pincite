import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  interpolateColors,
  spring,
  Easing,
  Img,
  staticFile,
} from "remotion";
import { Scene } from "../../components/Scene";
import { KineticText } from "../../components/KineticText";
import { PatentDoc } from "../../components/PatentDoc";
import { COLORS } from "../../colors";
import { LINES } from "../theme";
import { SignalMark } from "@visual/signal";

const RECOLOR = [
  "Claim 5 multiple dependent",
  "Claim 4 antecedent basis",
  "Numerals 108, 203, 216, 224",
];
const DOCS = ["Specification DOCX", "Application data sheet", "Declaration", "Transmittal", "Fee summary", "Drawings"];

function FieldCallback({ width = 1920, height = 1080, zoom = 1 }: { width?: number; height?: number; zoom?: number }) {
  const COLS = 16;
  const ROWS = 8;
  const SC = 8;
  const SR = 3;
  const cell = 96;
  const size = 62;
  const gridW = COLS * cell;
  const gridH = ROWS * cell;
  // Center the SURVIVOR (not the grid) at the frame center, so the zoom fills
  // symmetrically and the closing line sits in the middle of the green square.
  const offX = width / 2 - (SC * cell + cell / 2);
  const offY = height / 2 - (SR * cell + cell / 2);
  const survCX = width / 2;
  const survCY = height / 2;
  return (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${zoom})`, transformOrigin: `${survCX}px ${survCY}px` }}>
      <div style={{ position: "absolute", left: offX, top: offY, width: gridW, height: gridH }}>
        {Array.from({ length: ROWS }).map((_, r) =>
          Array.from({ length: COLS }).map((_, c) => {
            const isSurv = r === SR && c === SC;
            // same field as the opening: about one in ten accepted (green), the
            // rest red - but now ours (bordered) is green too.
            const isGreen = isSurv || (r * COLS + c + r * 3) % 10 === 6;
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
                  background: isGreen ? COLORS.pass : COLORS.violation,
                  border: isSurv ? `2px solid ${COLORS.foreground}` : "none",
                  boxShadow: isSurv ? "0 6px 20px rgba(0,0,0,0.18)" : "none",
                }}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}

// Beat 5 - the payoff. Findings recolor red to green, it exports a real filing
// ready application, the field callback shows the one green application among the
// red, and the logo lands.
export function Payoff({ width = 1920, height = 1080 }: { width?: number; height?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Hold the recolor panel out until just after the incoming crossfade (14f)
  // completes, so this beat's green-resolved content does not stack on the
  // outgoing prior-art beat's red banner at the transition midpoint.
  const aIn = interpolate(frame, [8, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const aOut = interpolate(frame, [128, 148], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bIn = interpolate(frame, [140, 162], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // zoom the camera into the one green survivor (successfully filed), until it fills the frame.
  const zoom = interpolate(frame, [182, 226], [1, 20], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const bOut = interpolate(frame, [224, 242], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cIn = interpolate(frame, [232, 252], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const logoT = spring({ frame: frame - 234, fps, config: { damping: 200 } });
  const docT = spring({ frame: frame - 44, fps, config: { damping: 200 } });

  return (
    <Scene
      // headline, onto the recoloring findings, over to the filing-ready
      // document, then up top so the logo lands on clean white (dead center
      // would stack the glow and its mirrored counterweight on the logo)
      hue={[
        { f: 0, x: 50, y: 14 },
        { f: 24, x: 50, y: 14 },
        { f: 56, x: 28, y: 48 },
        { f: 90, x: 28, y: 52 },
        { f: 122, x: 68, y: 50 },
        { f: 152, x: 68, y: 52 },
        { f: 200, x: 50, y: 24 },
        { f: 255, x: 50, y: 24 },
      ]}
    >
      {/* A: recolor + the real filing-ready document */}
      <AbsoluteFill className="flex-col justify-center" style={{ opacity: aIn * aOut, padding: "40px 90px" }}>
        <div className="text-center">
          <KineticText
            text={LINES.payoff}
            startFrame={4}
            className="font-serif"
            style={{ fontSize: 64, fontWeight: 700, color: COLORS.foreground }}
          />
          <p className="mt-3 text-[24px] text-muted-foreground">Every document formatted automatically</p>
        </div>
        {/* the left card and the document are one row that stretches to a shared
            height, so their top and bottom edges line up (no floating columns) */}
        <div style={{ marginTop: 34, display: "flex", justifyContent: "center", gap: 72, alignItems: "stretch" }}>
          <div style={{ width: 700, flexShrink: 0 }} className="flex flex-col justify-center rounded-2xl border bg-card p-7">
            <div className="mb-4 text-[14px] font-semibold uppercase tracking-wide text-muted-foreground">
              Findings resolved
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {RECOLOR.map((t, i) => {
                const rt = interpolate(frame, [18 + i * 12, 18 + i * 12 + 20], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
                const dot = interpolateColors(rt, [0, 1], [COLORS.violation, COLORS.pass]);
                return (
                  <div key={i} className="flex items-center gap-3 rounded-xl border bg-background p-3.5">
                    <span style={{ width: 13, height: 13, borderRadius: 999, background: dot, display: "inline-block" }} />
                    <span className="flex-1 text-[17px] font-medium text-foreground">{t}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: interpolateColors(rt, [0, 1], [COLORS.mutedForeground, COLORS.pass]) }}>
                      {rt > 0.5 ? "Resolved" : "Violation"}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mb-3 mt-6 border-t pt-6 text-[14px] font-semibold uppercase tracking-wide text-muted-foreground">
              Filing package
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {DOCS.map((d, i) => {
                const sp = spring({ frame: frame - (46 + i * 6), fps, config: { damping: 200 } });
                return (
                  <div
                    key={d}
                    style={{ opacity: sp, transform: `translateX(${interpolate(sp, [0, 1], [30, 0])}px)` }}
                    className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2.5"
                  >
                    <SignalMark signal="green" className="size-4" />
                    <span className="text-[15px] text-muted-foreground">{d}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              opacity: docT,
              transform: `translateX(${interpolate(docT, [0, 1], [60, 0])}px)`,
            }}
          >
            <PatentDoc style={{ width: 620, transform: `scale(${interpolate(docT, [0, 1], [0.94, 1])})` }} />
          </div>
        </div>
      </AbsoluteFill>

      {/* B: field callback, then zoom into the one green survivor */}
      <AbsoluteFill style={{ opacity: bIn * bOut }}>
        <FieldCallback width={width} height={height} zoom={zoom} />
      </AbsoluteFill>

      {/* the line on the green fill */}
      <AbsoluteFill
        className="items-center justify-center"
        style={{ opacity: interpolate(frame, [208, 220, 236, 246], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}
      >
        <span className="font-serif" style={{ fontSize: 78, fontWeight: 700, color: "#ffffff" }}>
          Be the one that gets accepted
        </span>
      </AbsoluteFill>

      {/* C: logo only */}
      <AbsoluteFill className="items-center justify-center" style={{ opacity: cIn }}>
        <Img
          src={staticFile("pincite-logo.png")}
          style={{ height: 150, width: "auto", transform: `scale(${interpolate(logoT, [0, 1], [0.92, 1])})` }}
        />
      </AbsoluteFill>
    </Scene>
  );
}
