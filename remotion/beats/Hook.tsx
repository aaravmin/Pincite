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
        <div style={{ width: 1560, transform: "scale(1.12)" }}>
          <div style={{ position: "relative" }}>
            {/* soft glow so the app window floats (sleek app presentation) */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: -34,
                borderRadius: 44,
                background: "radial-gradient(55% 55% at 50% 42%, rgba(0,0,0,0.08), transparent 72%)",
                filter: "blur(26px)",
              }}
            />
            <AnnotatedEditor
              text={HOOK_CLAIMS}
              spans={HOOK_SPANS}
              activeFlagId="md"
              progress={editorProgress}
              caption={APPLE_META.claimsCaption}
              className="shadow-[0_44px_110px_-24px_rgba(0,0,0,0.28)] ring-1 ring-black/5"
            />
          </div>
          <div className="mt-10 text-center" style={{ maxWidth: 1180, marginLeft: "auto", marginRight: "auto" }}>
          <KineticText
            text={LINES.themeSub}
            startFrame={198}
            className="font-serif"
            style={{ fontSize: 56, fontWeight: 700, color: COLORS.foreground }}
          />
          <div className="mt-3">
            <KineticText
              text={LINES.themeSub2}
              startFrame={226}
              className="font-serif"
              style={{ fontSize: 40, fontWeight: 500, color: COLORS.mutedForeground }}
            />
          </div>
          </div>
        </div>
      </AbsoluteFill>
    </Scene>
  );
}
