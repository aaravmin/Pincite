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

const COLS = 16;
const ROWS = 9;
const SURV_C = 8;
const SURV_R = 4;

// Beat 0 - theme and hook. A wide field of applications, almost all flipping red
// in a staggered wave, then the camera pushes into the single survivor, which
// resolves into the Apple draft (with its claim 6 flag).
export function Hook({ width = 1920, height = 1080 }: { width?: number; height?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cellW = width / COLS;
  const cellH = height / ROWS;
  const markerSize = Math.min(cellW, cellH) * 0.6;
  const survX = SURV_C * cellW + cellW / 2;
  const survY = SURV_R * cellH + cellH / 2;

  const pushT = interpolate(frame, [78, 168], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const scale = interpolate(pushT, [0, 1], [1, 17]);
  const fieldOpacity = interpolate(frame, [150, 186], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const editorT = spring({ frame: frame - 150, fps, config: { damping: 200 } });
  const editorProgress = interpolate(frame, [168, 210], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const themeOut = interpolate(frame, [132, 166], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Scene>
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
              const flipStart = interpolate(d, [0, ROWS + COLS - 2], [8, 66]);
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
                    top: r * cellH + (cellH - markerSize) / 2,
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

      <AbsoluteFill className="items-center justify-center" style={{ opacity: themeOut }}>
        <div className="px-24 text-center">
          <KineticText
            text={LINES.theme}
            startFrame={6}
            className="font-serif"
            style={{ fontSize: 92, fontWeight: 700, lineHeight: 1.02, color: COLORS.foreground }}
          />
        </div>
      </AbsoluteFill>

      <AbsoluteFill
        className="items-center justify-center"
        style={{
          opacity: editorT,
          transform: `scale(${interpolate(editorT, [0, 1], [0.88, 1])})`,
        }}
      >
        <div style={{ width: 1180 }}>
          <AnnotatedEditor
            text={APPLE_HERO_CLAIMS}
            spans={APPLE_HERO_SPANS}
            activeFlagId="claim-6"
            progress={editorProgress}
            caption={APPLE_META.claimsCaption}
          />
          <div className="mt-6 text-center">
            <KineticText
              text={LINES.themeSub}
              startFrame={182}
              className="font-serif"
              style={{ fontSize: 38, fontWeight: 500, color: COLORS.mutedForeground }}
            />
          </div>
        </div>
      </AbsoluteFill>
    </Scene>
  );
}
