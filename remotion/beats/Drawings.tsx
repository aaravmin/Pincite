import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { Scene } from "../components/Scene";
import { KineticText } from "../components/KineticText";
import { COLORS } from "../colors";
import { LINES } from "../theme";
import { SignalMark } from "@visual/signal";

// The draw-on stroke effect from the brief: the ring animates its stroke on.
function DrawOnCircle({ cx, cy, r, delay }: { cx: number; cy: number; r: number; delay: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const c = 2 * Math.PI * r;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill="none"
      stroke={COLORS.violation}
      strokeWidth={4}
      strokeDasharray={c}
      strokeDashoffset={c * (1 - t)}
      transform={`rotate(-90 ${cx} ${cy})`}
    />
  );
}

const NUMERALS = [
  { n: 14, delay: 62 },
  { n: 16, delay: 84 },
];

// Beat 3 - the drawing check. Red circles draw themselves onto reference numerals
// the specification never introduces. It reads your drawings too.
export function Drawings({ width = 1080, height = 1350 }: { width?: number; height?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Scene>
      <div style={{ position: "absolute", inset: 0, padding: "80px" }}>
        <div className="text-center">
          <KineticText
            text={LINES.drawings}
            startFrame={4}
            className="font-serif"
            style={{
              fontSize: 58,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: COLORS.foreground,
            }}
          />
        </div>

        <div className="mx-auto mt-14 rounded-2xl border bg-card p-10" style={{ maxWidth: 840 }}>
          <div className="mb-3 font-mono text-xs text-muted-foreground">FIG. 1</div>
          <svg viewBox="0 0 400 230" className="w-full" role="img" aria-label="Figure with two reference numerals flagged">
            <rect x="70" y="55" width="260" height="120" rx="14" fill="none" stroke={COLORS.border} strokeWidth={2.5} />
            <line x1="140" y1="55" x2="140" y2="175" stroke={COLORS.border} strokeWidth={1.5} />
            <line x1="70" y1="115" x2="330" y2="115" stroke={COLORS.border} strokeWidth={1.5} />
            <line x1="200" y1="55" x2="200" y2="30" stroke={COLORS.mutedForeground} strokeWidth={1.2} />
            <line x1="105" y1="115" x2="105" y2="115" stroke={COLORS.mutedForeground} strokeWidth={1.2} />
            <text x="115" y="24" fill={COLORS.mutedForeground} fontSize={13} fontFamily="monospace">10</text>
            <text x="235" y="24" fill={COLORS.mutedForeground} fontSize={13} fontFamily="monospace">12</text>
            <text x="300" y="212" fill={COLORS.mutedForeground} fontSize={13} fontFamily="monospace">14</text>
            <text x="95" y="212" fill={COLORS.mutedForeground} fontSize={13} fontFamily="monospace">16</text>
            <DrawOnCircle cx={305} cy={207} r={17} delay={62} />
            <DrawOnCircle cx={100} cy={207} r={17} delay={84} />
          </svg>
        </div>

        <div className="mx-auto mt-10" style={{ maxWidth: 840, display: "flex", flexDirection: "column", gap: 12 }}>
          {NUMERALS.map((item) => {
            const sp = spring({ frame: frame - (item.delay + 14), fps, config: { damping: 200 } });
            return (
              <div
                key={item.n}
                style={{ opacity: sp, transform: `translateY(${interpolate(sp, [0, 1], [16, 0])}px)` }}
                className="flex items-center gap-3 rounded-xl border bg-card p-4"
              >
                <SignalMark signal="red" />
                <span className="text-[17px] font-medium text-foreground">
                  Reference numeral {item.n} is never introduced in the specification
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Scene>
  );
}
