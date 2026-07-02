import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  interpolateColors,
  spring,
  Easing,
} from "remotion";
import { Scene } from "../../components/Scene";
import { KineticText } from "../../components/KineticText";
import { COLORS } from "../../colors";
import { LINES } from "../theme";
import { AnnotatedEditor } from "@visual/annotated-editor";
import { APPLE_META } from "@visual/fixtures/apple-example";
import type { VisualSpan } from "@visual/types";

// A multiple dependent violation (claims joined by "and", not "or").
const HOOK_CLAIMS =
  "1. A molded fiber container suitable for containing a food item …\n" +
  "2. The container of claim 1, wherein the base and the lid are formed as one piece.\n" +
  "3. The container of claim 1, wherein the ridges are arranged concentrically.\n" +
  "4. The container of claims 1 and 2, wherein the base and the lid nest with a second container.";
const HS = HOOK_CLAIMS.indexOf("claims 1 and 2");
const HOOK_SPANS: VisualSpan[] = [{ start: HS, end: HS + "claims 1 and 2".length, signal: "red", flagId: "md" }];

// A compact, centered field of dots (Snowscroll-style). 15x7, the middle dot is
// ours; about one in ten is accepted (green), the rest rejected (red).
const COLS = 15;
const ROWS = 7;
const SR = 3;
const SC = 7;
// The field spans the headline width ("Nine ... rejected"), with big dots.
const CELL = 97;
const DOT = 56;
const FCX = 960;
const FCY = 600;

const isGreen = (r: number, c: number) => (r * COLS + c + r * 3) % 10 === 4;

// Beat 0 - theme and hook. A field of applications flips in dot by dot on a wave;
// most are rejected (red), about one in ten accepted (green), and ours is the hole
// in the middle. The camera pushes in as ours grows, rounds, and whitens into the
// draft, then the field flies out - the draft is left floating with its flag.
export function Hook({ width = 1920 }: { width?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const gridW = COLS * CELL;
  const gridH = ROWS * CELL;
  const left0 = FCX - gridW / 2;
  const top0 = FCY - gridH / 2;
  const survX = left0 + SC * CELL + CELL / 2;
  const survY = top0 + SR * CELL + CELL / 2;
  const maxD = ROWS + COLS - 2;

  // the other applications fly outward as the camera pushes in
  const pushT = interpolate(frame, [116, 196], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const fieldScale = interpolate(pushT, [0, 1], [1, 15]);
  const fieldOpacity = interpolate(frame, [156, 196], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const headOut = interpolate(frame, [128, 162], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // the survivor dot transforms into the draft: grows, rounds, whitens
  const EDW = 1480;
  const EDH = 210;
  const EDCY = 412;
  const morph = interpolate(frame, [116, 196], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const cardW = interpolate(morph, [0, 1], [DOT, EDW]);
  const cardH = interpolate(morph, [0, 1], [DOT, EDH]);
  const cardCY = interpolate(morph, [0, 1], [survY, EDCY]);
  const cardBg = interpolateColors(interpolate(morph, [0.1, 0.62], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), [0, 1], [COLORS.neutralMarker, "#ffffff"]);
  const cardBorder = interpolateColors(interpolate(morph, [0.25, 0.78], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), [0, 1], [COLORS.foreground, "#d4d4d8"]);
  const cardRadius = interpolate(morph, [0, 1], [DOT / 2, 16]);
  const cardShadow = interpolate(morph, [0.4, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cardOpacity = interpolate(frame, [196, 208], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const editorOp = interpolate(frame, [170, 196], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const editorProgress = interpolate(frame, [196, 232], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Scene
      // headline, down into the field as it flips in, up to the draft as the
      // survivor morphs, then down to the sublines
      hue={[
        { f: 0, x: 50, y: 20 },
        { f: 26, x: 50, y: 20 },
        { f: 62, x: 50, y: 54 },
        { f: 104, x: 50, y: 54 },
        { f: 156, x: 50, y: 40 },
        { f: 196, x: 50, y: 38 },
        { f: 228, x: 50, y: 60 },
        { f: 300, x: 50, y: 62 },
      ]}
    >
      {/* the field of applications - dots flip in on a diagonal wave */}
      <AbsoluteFill style={{ opacity: fieldOpacity, transform: `scale(${fieldScale})`, transformOrigin: `${survX}px ${survY}px` }}>
        <div style={{ position: "absolute", left: left0, top: top0, width: gridW, height: gridH }}>
          {Array.from({ length: ROWS }).map((_, r) =>
            Array.from({ length: COLS }).map((_, c) => {
              if (r === SR && c === SC) return null; // ours - the hole that becomes the patent
              const delay = interpolate(r + c, [0, maxD], [0, 72]);
              const t = spring({ frame: frame - 10 - delay, fps, config: { damping: 200 } });
              return (
                <div
                  key={`${r}-${c}`}
                  style={{
                    position: "absolute",
                    left: c * CELL + (CELL - DOT) / 2,
                    top: r * CELL + (CELL - DOT) / 2,
                    width: DOT,
                    height: DOT,
                    borderRadius: 999,
                    background: isGreen(r, c) ? COLORS.pass : COLORS.violation,
                    opacity: t,
                    transform: `scale(${interpolate(t, [0, 1], [0.4, 1])})`,
                  }}
                />
              );
            }),
          )}
        </div>
      </AbsoluteFill>

      {/* headline + qualifier, in a clear band up top */}
      <div style={{ position: "absolute", top: 74, left: 0, right: 0, textAlign: "center", opacity: headOut }} className="px-24">
        <KineticText text={LINES.theme} startFrame={8} className="font-serif" style={{ fontSize: 86, fontWeight: 700, lineHeight: 1.0, color: COLORS.foreground }} />
        <div className="mt-2.5">
          <KineticText text={LINES.themeFirst} startFrame={20} className="font-serif" style={{ fontSize: 38, fontWeight: 500, color: COLORS.mutedForeground }} />
        </div>
      </div>

      {/* the survivor morphing into the patent card */}
      <div
        style={{
          position: "absolute",
          left: width / 2 - cardW / 2,
          top: cardCY - cardH / 2,
          width: cardW,
          height: cardH,
          background: cardBg,
          border: `2px solid ${cardBorder}`,
          borderRadius: cardRadius,
          opacity: cardOpacity,
          boxShadow: `0 ${44 * cardShadow}px ${110 * cardShadow}px -24px rgba(0,0,0,${0.28 * cardShadow})`,
        }}
      />

      {/* the draft materializes inside, floating */}
      <div style={{ position: "absolute", left: width / 2 - EDW / 2, top: EDCY - EDH / 2, width: EDW, opacity: editorOp }}>
        <AnnotatedEditor
          text={HOOK_CLAIMS}
          spans={HOOK_SPANS}
          activeFlagId="md"
          progress={editorProgress}
          caption={APPLE_META.claimsCaption}
          className="shadow-[0_44px_110px_-24px_rgba(0,0,0,0.28)] ring-1 ring-black/5"
        />
      </div>

      {/* the sublines, below the patent */}
      <div style={{ position: "absolute", left: 0, right: 0, top: EDCY + EDH / 2 + 56, textAlign: "center" }}>
        <div style={{ maxWidth: 1180, marginLeft: "auto", marginRight: "auto" }}>
          <KineticText text={LINES.themeSub} startFrame={210} className="font-serif" style={{ fontSize: 56, fontWeight: 700, color: COLORS.foreground }} />
          <div className="mt-3">
            <KineticText text={LINES.themeSub2} startFrame={238} className="font-serif" style={{ fontSize: 40, fontWeight: 500, color: COLORS.mutedForeground }} />
          </div>
        </div>
      </div>
    </Scene>
  );
}
