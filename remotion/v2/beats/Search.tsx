import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";
import { Scene } from "../../components/Scene";
import { KineticText } from "../../components/KineticText";
import { COLORS } from "../../colors";
import { LINES } from "../theme";

// The second problem, the tedious landscape search. Everything here is NEUTRAL
// (grays and white) - being slow is not a violation, so no red, yellow, or green.

// A deterministic wall of small document cards drifting slowly upward behind the
// text. Ten columns, six rows (enough to cover the drift), fixed layout, low
// opacity, masked at the top and bottom so it never fights the copy.
const WALL_COLS = 10;
const WALL_ROWS = 6;
const CARD_W = 130;
const CARD_H = 170;
const WALL_GAP = 22;

function DocWall() {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 225], [30, -90], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const wallW = WALL_COLS * CARD_W + (WALL_COLS - 1) * WALL_GAP;
  const wallH = WALL_ROWS * CARD_H + (WALL_ROWS - 1) * WALL_GAP;
  return (
    <AbsoluteFill
      aria-hidden
      style={{
        opacity: 0.45,
        maskImage: "linear-gradient(180deg, transparent, #000 24%, #000 66%, transparent)",
        WebkitMaskImage: "linear-gradient(180deg, transparent, #000 24%, #000 66%, transparent)",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: wallW,
          height: wallH,
          transform: `translate(-50%, -50%) translateY(${drift}px)`,
        }}
      >
        {Array.from({ length: WALL_ROWS }).map((_, r) =>
          Array.from({ length: WALL_COLS }).map((_, c) => {
            // deterministic per-card line count (4 or 5) and a short last line
            const lines = ((r * WALL_COLS + c) % 2 === 0 ? 5 : 4);
            return (
              <div
                key={`${r}-${c}`}
                style={{
                  position: "absolute",
                  left: c * (CARD_W + WALL_GAP),
                  top: r * (CARD_H + WALL_GAP),
                  width: CARD_W,
                  height: CARD_H,
                  background: COLORS.background,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  padding: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 9,
                }}
              >
                {Array.from({ length: lines }).map((_, i) => (
                  <span
                    key={i}
                    style={{
                      height: 6,
                      borderRadius: 3,
                      background: "#e4e4e7",
                      width: i === lines - 1 ? "58%" : "100%",
                    }}
                  />
                ))}
              </div>
            );
          }),
        )}
      </div>
    </AbsoluteFill>
  );
}

// Beat 3 - the tedious prior-art search. A drifting wall of documents, a giant
// odometer of how many patents there are to check, and the plain truth that doing
// it by hand takes hours every time.
export function Search() {
  const frame = useCurrentFrame();

  const count = Math.round(
    interpolate(frame, [60, 150], [0, 12_000_000], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }),
  );
  const counterIn = interpolate(frame, [56, 74], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Scene
      // headline, down onto the question, onto the counter as it climbs, then to
      // the closing line
      hue={[
        { f: 0, x: 50, y: 12 },
        { f: 22, x: 50, y: 12 },
        { f: 40, x: 50, y: 34 },
        { f: 58, x: 50, y: 58 },
        { f: 150, x: 50, y: 58 },
        { f: 172, x: 50, y: 74 },
        { f: 225, x: 50, y: 74 },
      ]}
    >
      <DocWall />

      <AbsoluteFill className="flex-col items-center" style={{ padding: "70px 100px" }}>
        <div className="text-center">
          <KineticText
            text={LINES.searchLead}
            startFrame={4}
            className="font-serif"
            style={{ fontSize: 52, fontWeight: 600, color: COLORS.foreground }}
          />
        </div>

        <div className="mt-6 text-center">
          <KineticText
            text={LINES.searchQuestion}
            startFrame={24}
            className="font-serif"
            style={{ fontSize: 84, fontWeight: 700, color: COLORS.foreground }}
          />
        </div>

        {/* the odometer */}
        <div className="mt-14 flex flex-col items-center" style={{ opacity: counterIn }}>
          <span
            className="font-bold text-foreground"
            style={{ fontFamily: "var(--font-geist-mono)", fontSize: 96, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}
          >
            {count.toLocaleString("en-US")}
          </span>
          <span className="mt-4 text-[24px] text-muted-foreground">{LINES.searchCaption}</span>
        </div>

        <div className="mt-14 text-center">
          <KineticText
            text={LINES.searchClose}
            startFrame={170}
            className="font-serif"
            style={{ fontSize: 36, fontWeight: 500, color: COLORS.mutedForeground }}
          />
        </div>
      </AbsoluteFill>
    </Scene>
  );
}
