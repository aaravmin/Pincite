import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  interpolateColors,
  Easing,
} from "remotion";
import { Scene } from "../components/Scene";
import { KineticText } from "../components/KineticText";
import { COLORS } from "../colors";
import { LINES } from "../theme";
import { AnnotatedEditor } from "@visual/annotated-editor";
import { APPLE_META } from "@visual/fixtures/apple-example";
import type { VisualSpan } from "@visual/types";

// A different violation than "claim does not exist" (which the later beats use):
// a multiple dependent claim joined by "and" instead of "or".
const HOOK_CLAIMS =
  "1. A molded fiber container suitable for containing a food item …\n" +
  "2. The container of claim 1, wherein the base and the lid are formed as one piece.\n" +
  "3. The container of claim 1, wherein the ridges are arranged concentrically.\n" +
  "4. The container of claims 1 and 2, wherein the base and the lid nest with a second container.";
const HS = HOOK_CLAIMS.indexOf("claims 1 and 2");
const HOOK_SPANS: VisualSpan[] = [{ start: HS, end: HS + "claims 1 and 2".length, signal: "red", flagId: "md" }];

const COLS = 15;
const ROWS = 7;
const SURV_C = 7;
const SURV_R = 3;
const FIELD_TOP = 250;

// Beat 0 - theme and hook. The other applications flip red and fly outward as the
// camera pushes into the single survivor, which slowly transforms (grows, rounds,
// whitens) into the patent draft before the field fades.
export function Hook({ width = 1920, height = 1080 }: { width?: number; height?: number }) {
  const frame = useCurrentFrame();

  const fieldH = height - FIELD_TOP;
  const cellW = width / COLS;
  const cellH = fieldH / ROWS;
  const markerSize = Math.min(cellW, cellH) * 0.62;
  const survX = SURV_C * cellW + cellW / 2;
  const survY = FIELD_TOP + SURV_R * cellH + cellH / 2;

  // the other applications fly outward as the camera pushes in
  const pushT = interpolate(frame, [100, 182], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const fieldScale = interpolate(pushT, [0, 1], [1, 16]);
  const fieldOpacity = interpolate(frame, [150, 186], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // the survivor transforms into the patent: grows, rounds, whitens
  const EDW = 1480;
  const EDH = 210;
  const EDCY = 500;
  const morph = interpolate(frame, [100, 180], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const cardW = interpolate(morph, [0, 1], [markerSize, EDW]);
  const cardH = interpolate(morph, [0, 1], [markerSize, EDH]);
  const cardCY = interpolate(morph, [0, 1], [survY, EDCY]);
  const cardBg = interpolateColors(interpolate(morph, [0.1, 0.62], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), [0, 1], [COLORS.neutralMarker, "#ffffff"]);
  const cardBorder = interpolateColors(interpolate(morph, [0.25, 0.78], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), [0, 1], [COLORS.foreground, "#d4d4d8"]);
  const cardRadius = interpolate(morph, [0, 1], [12, 14]);
  const cardShadow = interpolate(morph, [0.4, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cardOpacity = interpolate(frame, [186, 198], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const survPulse = frame < 100 ? 1 + 0.04 * Math.sin(frame / 6) : 1;

  const editorOp = interpolate(frame, [162, 186], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const editorProgress = interpolate(frame, [184, 220], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const headOut = interpolate(frame, [128, 162], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Scene>
      {/* the field of other applications (survivor excluded, it becomes the patent) */}
      <AbsoluteFill style={{ opacity: fieldOpacity }}>
        <div style={{ position: "absolute", inset: 0, transform: `scale(${fieldScale})`, transformOrigin: `${survX}px ${survY}px` }}>
          {Array.from({ length: ROWS }).map((_, r) =>
            Array.from({ length: COLS }).map((_, c) => {
              if (r === SURV_R && c === SURV_C) return null;
              const d = r + c;
              const flipStart = interpolate(d, [0, ROWS + COLS - 2], [24, 96]);
              const flip = interpolate(frame, [flipStart, flipStart + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              const color = interpolateColors(flip, [0, 1], [COLORS.neutralMarker, COLORS.violation]);
              return (
                <div key={`${r}-${c}`} style={{ position: "absolute", left: c * cellW + (cellW - markerSize) / 2, top: FIELD_TOP + r * cellH + (cellH - markerSize) / 2, width: markerSize, height: markerSize, borderRadius: 10, background: color }} />
              );
            }),
          )}
        </div>
      </AbsoluteFill>

      {/* headline in its own clear band */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: FIELD_TOP, opacity: headOut }} className="flex items-center justify-center px-24">
        <KineticText text={LINES.theme} startFrame={6} className="font-serif" style={{ fontSize: 88, fontWeight: 700, lineHeight: 1.0, color: COLORS.foreground }} />
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
          transform: `scale(${survPulse})`,
          opacity: cardOpacity,
          boxShadow: `0 ${44 * cardShadow}px ${110 * cardShadow}px -24px rgba(0,0,0,${0.28 * cardShadow})`,
        }}
      />

      {/* the draft materializes inside, once the card is full size */}
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
      <div style={{ position: "absolute", left: 0, right: 0, top: EDCY + EDH / 2 + 64, textAlign: "center" }}>
        <div style={{ maxWidth: 1180, marginLeft: "auto", marginRight: "auto" }}>
          <KineticText text={LINES.themeSub} startFrame={202} className="font-serif" style={{ fontSize: 56, fontWeight: 700, color: COLORS.foreground }} />
          <div className="mt-3">
            <KineticText text={LINES.themeSub2} startFrame={230} className="font-serif" style={{ fontSize: 40, fontWeight: 500, color: COLORS.mutedForeground }} />
          </div>
        </div>
      </div>
    </Scene>
  );
}
