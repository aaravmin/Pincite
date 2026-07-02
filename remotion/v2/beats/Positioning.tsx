import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { Scene } from "../../components/Scene";
import { KineticText } from "../../components/KineticText";
import { COLORS } from "../../colors";
import { LINES } from "../theme";

// The three tedious jobs Pincite takes on. Plain descriptions, not passes, so no
// colored marks - neutral pills only.
const PILLS = ["Checks every rule", "Proposes fixes you approve", "Searches existing patents"];

// Beat 4 - the pivot. A clean title beat with generous whitespace: Pincite
// automates the tedious parts, and it never invents for you.
export function Positioning() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Scene
      // gentle path down the beat, headline then pills then the emphasis
      hue={[
        { f: 0, x: 50, y: 30 },
        { f: 40, x: 50, y: 30 },
        { f: 64, x: 50, y: 50 },
        { f: 100, x: 50, y: 68 },
        { f: 185, x: 50, y: 68 },
      ]}
    >
      {/* nudge the column up so the headline sits around 38% of the frame */}
      <AbsoluteFill className="flex-col items-center justify-center" style={{ padding: "0 120px", paddingBottom: 120 }}>
        <div className="text-center">
          <KineticText
            text={LINES.positioning}
            startFrame={6}
            className="font-serif"
            style={{ fontSize: 84, fontWeight: 700, color: COLORS.foreground }}
          />
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-5">
          {PILLS.map((p, i) => {
            const sp = spring({ frame: frame - (40 + i * 12), fps, config: { damping: 200 } });
            return (
              <div
                key={p}
                style={{ opacity: sp, transform: `translateY(${interpolate(sp, [0, 1], [18, 0])}px)` }}
                className="rounded-full border bg-card px-7 py-3.5 text-[26px] font-medium text-foreground"
              >
                {p}
              </div>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <KineticText
            text={LINES.positioningEmph1}
            startFrame={100}
            className="font-serif"
            style={{ fontSize: 46, fontWeight: 600, color: COLORS.foreground }}
          />
          <div className="mt-3">
            <KineticText
              text={LINES.positioningEmph2}
              startFrame={126}
              className="font-serif"
              style={{ fontSize: 34, fontWeight: 500, color: COLORS.mutedForeground }}
            />
          </div>
        </div>
      </AbsoluteFill>
    </Scene>
  );
}
