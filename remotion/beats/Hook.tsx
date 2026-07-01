import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  interpolateColors,
  spring,
  Easing,
} from "remotion";
import { Scene } from "../components/Scene";
import { KineticText } from "../components/KineticText";
import { COLORS } from "../colors";
import { LINES } from "../theme";
import { AnnotatedEditor } from "@visual/annotated-editor";
import {
  APPLE_HERO_CLAIMS,
  APPLE_HERO_SPANS,
  APPLE_META,
} from "@visual/fixtures/apple-example";

const COLS = 15;
const ROWS = 7;
const SURV_C = 7;
const SURV_R = 3;
const FIELD_TOP = 250;

// Beat 0 - theme and hook. The headline sits in its own clear band up top (never
// over the red field). Below, a field of applications flips red in a wave, then
// the camera pushes into the single survivor, which resolves into the Apple draft.
export function Hook({ width = 1920, height = 1080 }: { width?: number; height?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fieldH = height - FIELD_TOP;
  const cellW = width / COLS;
  const cellH = fieldH / ROWS;
  const markerSize = Math.min(cellW, cellH) * 0.62;
  const survX = SURV_C * cellW + cellW / 2;
  const survY = FIELD_TOP + SURV_R * cellH + cellH / 2;

  const pushT = interpolate(frame, [96, 168], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const scale = interpolate(pushT, [0, 1], [1, 18]);
  const fieldOpacity = interpolate(frame, [150, 184], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const headOut = interpolate(frame, [138, 168], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const editorT = spring({ frame: frame - 158, fps, config: { damping: 200 } });
  const editorProgress = interpolate(frame, [176, 220], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Scene>
      {/* the field (lower region only, so it never sits under the headline) */}
      <AbsoluteFill style={{ opacity: fieldOpacity }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `scale(${scale})`,
            transformOrigin: `${survX}px ${survY}px`,
          }}
        >
          {Array.from({ length: ROWS }).map((_, r) =>
            Array.from({ length: COLS }).map((_, c) => {
              const isSurv = r === SURV_R && c === SURV_C;
              const d = r + c;
              const flipStart = interpolate(d, [0, ROWS + COLS - 2], [24, 96]);
              const flip = isSurv
                ? 0
                : interpolate(frame, [flipStart, flipStart + 14], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  });
              const color = isSurv
                ? COLORS.neutralMarker
                : interpolateColors(flip, [0, 1], [COLORS.neutralMarker, COLORS.violation]);
              const survPulse = isSurv ? 1 + 0.05 * Math.sin(frame / 6) : 1;
              return (
                <div
                  key={`${r}-${c}`}
                  style={{
                    position: "absolute",
                    left: c * cellW + (cellW - markerSize) / 2,
                    top: FIELD_TOP + r * cellH + (cellH - markerSize) / 2,
                    width: markerSize,
                    height: markerSize,
                    borderRadius: 10,
                    background: color,
                    border: isSurv ? `2px solid ${COLORS.foreground}` : "none",
                    transform: `scale(${survPulse})`,
                    boxShadow: isSurv ? "0 6px 22px rgba(0,0,0,0.16)" : "none",
                  }}
                />
              );
            }),
          )}
        </div>
      </AbsoluteFill>

      {/* headline, in its own clear band at the top */}
      <div
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: FIELD_TOP, opacity: headOut }}
        className="flex items-center justify-center px-24"
      >
        <KineticText
          text={LINES.theme}
          startFrame={6}
          className="font-serif"
          style={{ fontSize: 88, fontWeight: 700, lineHeight: 1.0, color: COLORS.foreground }}
        />
      </div>

      {/* the draft resolves in, centered */}
      <AbsoluteFill
        className="flex-col items-center justify-center"
        style={{ opacity: editorT, transform: `scale(${interpolate(editorT, [0, 1], [0.9, 1])})` }}
      >
        <div style={{ width: 1240 }}>
          <AnnotatedEditor
            text={APPLE_HERO_CLAIMS}
            spans={APPLE_HERO_SPANS}
            activeFlagId="claim-6"
            progress={editorProgress}
            caption={APPLE_META.claimsCaption}
          />
          <div className="mt-8 text-center">
          <KineticText
            text={LINES.themeSub}
            startFrame={198}
            className="font-serif"
            style={{ fontSize: 46, fontWeight: 600, color: COLORS.foreground }}
          />
          <div className="mt-2">
            <KineticText
              text={LINES.themeSub2}
              startFrame={224}
              className="font-serif"
              style={{ fontSize: 34, fontWeight: 500, color: COLORS.mutedForeground }}
            />
          </div>
          </div>
        </div>
      </AbsoluteFill>
    </Scene>
  );
}
