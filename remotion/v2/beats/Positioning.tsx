import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { ShieldCheck, PencilLine, Search, FileCheck } from "lucide-react";
import { Scene } from "../../components/Scene";
import { KineticText } from "../../components/KineticText";
import { COLORS } from "../../colors";
import { LINES } from "../theme";

// The four tedious jobs Pincite takes on, shown as a sequential, connected
// workflow (not standalone pills). Plain capabilities, not passes, so everything
// stays NEUTRAL - no red, yellow, or green marks. The fix icon is a pencil, never
// a wand, because Pincite never invents.
const STEPS = [
  { label: "Checks every rule", Icon: ShieldCheck },
  { label: "Proposes fixes you approve", Icon: PencilLine },
  { label: "Searches existing patents", Icon: Search },
  { label: "Auto formats every document", Icon: FileCheck },
] as const;

// Rail + node geometry. Four columns evenly spaced across RAIL_W; the badge
// centers land at each column's center, and the connector runs badge-edge to
// badge-edge between consecutive nodes.
const RAIL_W = 1560;
const COL_W = RAIL_W / STEPS.length; // 390
const BADGE = 72;
const colCenter = (i: number) => COL_W * i + COL_W / 2;

// Beat 4 - the pivot. Pincite automates the tedious parts, shown as a connected
// four-step pipeline that draws in left to right, then the emphasis that it never
// invents for you and the idea stays yours.
export function Positioning() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // nodes stagger in; each connector segment draws right after its LEFT node
  const nodeStart = (i: number) => 44 + i * 11;
  const nodeSpring = (i: number) => spring({ frame: frame - nodeStart(i), fps, config: { damping: 200 } });

  return (
    <Scene
      // gentle path down the beat, headline then the pipeline then the emphasis
      hue={[
        { f: 0, x: 50, y: 30 },
        { f: 40, x: 50, y: 30 },
        { f: 64, x: 50, y: 50 },
        { f: 110, x: 50, y: 68 },
        { f: 195, x: 50, y: 68 },
      ]}
    >
      <AbsoluteFill className="flex-col items-center justify-center" style={{ padding: "0 120px", paddingBottom: 96 }}>
        <div className="text-center">
          <KineticText
            text={LINES.positioning}
            startFrame={6}
            className="font-serif"
            style={{ fontSize: 84, fontWeight: 700, color: COLORS.foreground }}
          />
        </div>

        {/* the connected four-step pipeline */}
        <div style={{ position: "relative", width: RAIL_W, height: 168, marginTop: 64 }}>
          {/* the connector rail: three segments through the node centers, each
              drawing in left to right after its left node springs in */}
          <div style={{ position: "absolute", left: 0, right: 0, top: BADGE / 2, height: 2 }}>
            {STEPS.slice(0, -1).map((_, i) => {
              const x1 = colCenter(i) + BADGE / 2 + 6;
              const x2 = colCenter(i + 1) - BADGE / 2 - 6;
              const draw = interpolate(frame, [nodeStart(i) + 6, nodeStart(i) + 24], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: x1,
                    top: 0,
                    width: (x2 - x1) * draw,
                    height: 2,
                    background: COLORS.border,
                  }}
                />
              );
            })}
          </div>

          {/* the nodes */}
          {STEPS.map((s, i) => {
            const sp = nodeSpring(i);
            const Icon = s.Icon;
            return (
              <div
                key={s.label}
                style={{
                  position: "absolute",
                  left: colCenter(i) - COL_W / 2,
                  top: 0,
                  width: COL_W,
                  opacity: sp,
                  transform: `translateY(${interpolate(sp, [0, 1], [16, 0])}px)`,
                }}
                className="flex flex-col items-center"
              >
                <div style={{ position: "relative" }}>
                  <div
                    style={{ width: BADGE, height: BADGE }}
                    className="flex items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm"
                  >
                    <Icon className="size-8" aria-hidden strokeWidth={1.75} />
                  </div>
                  {/* step number */}
                  <span
                    className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full border bg-background text-[13px] font-semibold text-foreground"
                  >
                    {i + 1}
                  </span>
                </div>
                <span
                  className="mt-4 px-2 text-center font-medium leading-snug text-foreground"
                  style={{ fontSize: 23 }}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <KineticText
            text={LINES.positioningEmph1}
            startFrame={110}
            className="font-serif"
            style={{ fontSize: 46, fontWeight: 600, color: COLORS.foreground }}
          />
          <div className="mt-3">
            <KineticText
              text={LINES.positioningEmph2}
              startFrame={136}
              className="font-serif"
              style={{ fontSize: 34, fontWeight: 500, color: COLORS.mutedForeground }}
            />
          </div>
        </div>
      </AbsoluteFill>
    </Scene>
  );
}
