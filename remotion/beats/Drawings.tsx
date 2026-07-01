import {
  AbsoluteFill,
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

// The draw-on stroke effect: the ring animates its stroke on (strokeDashoffset).
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
      strokeWidth={3.5}
      strokeDasharray={c}
      strokeDashoffset={c * (1 - t)}
      transform={`rotate(-90 ${cx} ${cy})`}
    />
  );
}

// Reference numerals that appear in FIG. 2 but not in the written description
// (37 CFR 1.84(p)(5): reference characters must appear in both).
const FLAGGED = [
  { n: "108", cx: 300, cy: 405, delay: 54 },
  { n: "203", cx: 118, cy: 420, delay: 68 },
  { n: "216", cx: 150, cy: 214, delay: 82 },
  { n: "224", cx: 452, cy: 392, delay: 96 },
];

const G = COLORS.mutedForeground;

// Beat 3 - the drawing check. A patent figure with several reference numerals the
// specification never introduces, each circled in red. It reads your drawings too.
export function Drawings({ width = 1920, height = 1080 }: { width?: number; height?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Scene>
      <AbsoluteFill className="flex-col items-center justify-center" style={{ padding: "50px 100px" }}>
        <div className="text-center">
          <KineticText
            text={LINES.drawings}
            startFrame={4}
            className="font-serif"
            style={{ fontSize: 68, fontWeight: 700, color: COLORS.foreground }}
          />
        </div>

        <div style={{ marginTop: 40, display: "flex", gap: 44, alignItems: "stretch", width: "100%" }}>
          {/* the figure */}
          <div style={{ flex: 1.15 }} className="rounded-2xl border bg-card p-6">
            <div className="mb-2 font-mono text-sm text-muted-foreground">FIG. 2</div>
            <svg viewBox="0 0 540 470" style={{ width: "100%" }} role="img" aria-label="Patent figure with flagged reference numerals">
              {/* outer housing (cross section, double wall + hatching) */}
              <rect x="150" y="70" width="240" height="300" rx="16" fill="none" stroke={G} strokeWidth={2.5} />
              <rect x="168" y="88" width="204" height="264" rx="10" fill="none" stroke={G} strokeWidth={1.6} />
              {Array.from({ length: 7 }).map((_, i) => (
                <line key={"hl" + i} x1={150} y1={90 + i * 40} x2={168} y2={78 + i * 40} stroke={G} strokeWidth={1} />
              ))}
              {Array.from({ length: 7 }).map((_, i) => (
                <line key={"hr" + i} x1={372} y1={90 + i * 40} x2={390} y2={78 + i * 40} stroke={G} strokeWidth={1} />
              ))}
              {/* outlet nozzle */}
              <path d="M250 70 L250 34 L290 34 L290 70 Z" fill="none" stroke={G} strokeWidth={2} />
              <line x1="270" y1="34" x2="270" y2="16" stroke={G} strokeWidth={2} />
              {/* piston */}
              <rect x="200" y="170" width="140" height="46" rx="4" fill="none" stroke={G} strokeWidth={2} />
              {/* seals on the piston */}
              <rect x="196" y="176" width="8" height="34" fill={G} opacity={0.5} />
              <rect x="336" y="176" width="8" height="34" fill={G} opacity={0.5} />
              {/* spring coil under the piston */}
              <path
                d="M210 216 L270 236 L210 256 L270 276 L210 296 L270 316 L330 316 L270 296 L330 276 L270 256 L330 236 L270 216"
                fill="none"
                stroke={G}
                strokeWidth={1.8}
              />
              {/* ball valve near the bottom */}
              <circle cx="270" cy="340" r="14" fill="none" stroke={G} strokeWidth={2} />
              {/* inlet tube */}
              <path d="M240 370 L240 410 L300 410 L300 370" fill="none" stroke={G} strokeWidth={2} />
              {/* mounting bracket */}
              <path d="M390 350 L430 350 L430 380 L410 380" fill="none" stroke={G} strokeWidth={2} />

              {/* leader lines + numerals */}
              <Leader x1={150} y1={110} x2={120} y2={92} n="100" />
              <Leader x1={270} y1={20} x2={300} y2={20} n="110" />
              <Leader x1={372} y1={130} x2={452} y2={120} n="102" />
              <Leader x1={340} y1={193} x2={462} y2={200} n="104" />
              <Leader x1={330} y1={266} x2={462} y2={300} n="106" />
              {/* flagged numerals */}
              <Leader x1={278} y1={352} x2={300} y2={405} n="108" flag />
              <Leader x1={240} y1={410} x2={118} y2={420} n="203" flag />
              <Leader x1={196} y1={193} x2={150} y2={214} n="216" flag />
              <Leader x1={430} y1={365} x2={452} y2={392} n="224" flag />

              {FLAGGED.map((f) => (
                <DrawOnCircle key={f.n} cx={f.cx} cy={f.cy} r={16} delay={f.delay} />
              ))}
            </svg>
          </div>

          {/* the findings */}
          <div style={{ flex: 0.85 }}>
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center gap-2">
                <SignalMark signal="red" />
                <span className="text-[20px] font-semibold text-foreground">
                  4 reference numerals not in the specification
                </span>
              </div>
              <p className="mt-2 text-[15px] text-muted-foreground">
                They appear in the drawing but are never described.
              </p>
              <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 10 }}>
                {FLAGGED.map((f, i) => {
                  const sp = spring({ frame: frame - (f.delay + 16), fps, config: { damping: 200 } });
                  return (
                    <span
                      key={f.n}
                      style={{ opacity: sp, transform: `scale(${interpolate(sp, [0, 1], [0.8, 1])})` }}
                      className="rounded-lg border border-violation bg-violation-bg px-3 py-1.5 font-mono text-[17px] font-medium text-violation"
                    >
                      {f.n}
                    </span>
                  );
                })}
              </div>
              <div className="mt-5 border-t pt-4">
                <span className="font-mono text-[15px] text-muted-foreground">
                  37 CFR 1.84(p)(5) . MPEP 608.02
                </span>
                <p className="mt-1 text-[15px] text-muted-foreground">
                  A reference character has to appear in both the drawing and the description.
                </p>
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </Scene>
  );
}

function Leader({ x1, y1, x2, y2, n, flag }: { x1: number; y1: number; x2: number; y2: number; n: string; flag?: boolean }) {
  return (
    <>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={G} strokeWidth={1.2} />
      <text x={x2} y={y2} dx={x2 < 270 ? -14 : 6} dy={5} fill={flag ? COLORS.violation : G} fontSize={17} fontFamily="monospace" fontWeight={flag ? 700 : 400}>
        {n}
      </text>
    </>
  );
}
