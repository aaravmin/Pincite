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
import { THEME_LINE, THEME_SUB } from "../theme";
import { AnnotatedEditor } from "@visual/annotated-editor";
import {
  APPLE_HERO_CLAIMS,
  APPLE_HERO_SPANS,
  APPLE_META,
} from "@visual/fixtures/apple-example";

const COLS = 9;
const ROWS = 11;
const SURV_C = 4;
const SURV_R = 5;

// Beat 0 - theme and hook. A field of applications, almost all flipping red in a
// staggered wave, then all but one recede as the camera pushes into the single
// survivor, which resolves into the Apple draft (with its claim 6 flag).
export function Hook({ width = 1080, height = 1350 }: { width?: number; height?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cellW = width / COLS;
  const cellH = height / ROWS;
  const markerSize = Math.min(cellW, cellH) * 0.62;
  const survX = SURV_C * cellW + cellW / 2;
  const survY = SURV_R * cellH + cellH / 2;

  // Macro to micro push into the survivor.
  const pushT = interpolate(frame, [105, 225], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const scale = interpolate(pushT, [0, 1], [1, 13]);
  const fieldOpacity = interpolate(frame, [200, 248], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // The draft resolves in over the survivor.
  const editorT = spring({ frame: frame - 205, fps, config: { damping: 200 } });
  const editorProgress = interpolate(frame, [235, 300], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const themeOut = interpolate(frame, [188, 226], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Scene>
      {/* the field */}
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
              const flipStart = interpolate(d, [0, ROWS + COLS - 2], [12, 92]);
              const flip = isSurv
                ? 0
                : interpolate(frame, [flipStart, flipStart + 16], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  });
              const color = isSurv
                ? COLORS.neutralMarker
                : interpolateColors(flip, [0, 1], [COLORS.neutralMarker, COLORS.violation]);
              const survPulse = isSurv ? 1 + 0.04 * Math.sin(frame / 6) : 1;
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

      {/* the theme line */}
      <AbsoluteFill className="items-center" style={{ opacity: themeOut }}>
        <div className="px-20 text-center" style={{ marginTop: height * 0.12 }}>
          <KineticText
            text={THEME_LINE}
            startFrame={8}
            className="font-serif"
            style={{
              fontSize: 76,
              fontWeight: 600,
              lineHeight: 1.04,
              letterSpacing: "-0.02em",
              color: COLORS.foreground,
            }}
          />
        </div>
      </AbsoluteFill>

      {/* the draft resolves in */}
      <AbsoluteFill
        className="items-center justify-center"
        style={{
          opacity: editorT,
          transform: `scale(${interpolate(editorT, [0, 1], [0.86, 1])})`,
        }}
      >
        <div style={{ width: 900 }}>
          <AnnotatedEditor
            text={APPLE_HERO_CLAIMS}
            spans={APPLE_HERO_SPANS}
            activeFlagId="claim-6"
            progress={editorProgress}
            caption={APPLE_META.claimsCaption}
          />
          <div className="mt-8 text-center">
            <KineticText
              text={THEME_SUB}
              startFrame={252}
              className="font-serif"
              style={{ fontSize: 40, color: COLORS.mutedForeground }}
            />
          </div>
        </div>
      </AbsoluteFill>
    </Scene>
  );
}
