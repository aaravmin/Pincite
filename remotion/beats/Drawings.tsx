import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  interpolateColors,
  Easing,
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
// (nx, ny) is the numeral + circle center; (px, py) is the point on the part.
const FLAGGED = [
  { n: "108", nx: 300, ny: 428, px: 272, py: 352, delay: 54 },
  { n: "203", nx: 120, ny: 430, px: 242, py: 410, delay: 68 },
  { n: "216", nx: 126, ny: 205, px: 197, py: 194, delay: 82 },
  { n: "224", nx: 470, ny: 398, px: 430, py: 366, delay: 96 },
];

const G = COLORS.mutedForeground;

// The other half of the rule, the written description itself. The scan sweeps
// the real paragraph text, each described numeral lights green as it is matched,
// and the four drawing-only numerals come back never mentioned.
// Each numeral is INTRODUCED in a different paragraph so the tally keeps
// climbing across the whole sweep, and the parts carrying the four flagged
// numerals (ball check, inlet, seals, bracket) are described with no numeral.
const SPEC_PARAS = [
  {
    tag: "[0012]",
    text: "Referring to FIG. 2, the dispenser comprises a housing 100 having an inner wall 102 that together enclose a working chamber.",
  },
  {
    tag: "[0013]",
    text: "A piston 104 is slidably received within the housing 100 and is biased by a coil spring 106 seated beneath it.",
  },
  {
    tag: "[0014]",
    text: "As the piston 104 advances against the spring 106, fluid in the chamber is urged upward and leaves the dispenser through an outlet nozzle 110.",
  },
  {
    tag: "[0015]",
    text: "Fluid enters through an inlet formed in the base, past a ball check, and the inner wall 102 carries seals that ride against the piston 104. A mounting bracket secures the housing 100 to a supporting surface.",
  },
];
const SPEC_TOTAL = SPEC_PARAS.reduce((n, p) => n + p.text.length, 0);
const SCAN_START = 100;
const SCAN_END = 168;

function SpecCrossCheck() {
  const frame = useCurrentFrame();
  const panelIn = interpolate(frame, [30, 52], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scanP = interpolate(frame, [SCAN_START, SCAN_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });
  const missT = interpolate(frame, [SCAN_END + 4, SCAN_END + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // walk the text once, lighting each numeral as the scan passes its position
  let offset = 0;
  let firstLit: number | null = null;
  const litValues = new Set<string>();
  const paras = SPEC_PARAS.map((p) => {
    const nodes = p.text.split(/(\d{3})/).map((tok, i) => {
      const at = offset;
      offset += tok.length;
      if (!/^\d{3}$/.test(tok)) return <span key={i}>{tok}</span>;
      // scaled slightly ahead of the scan so the last numeral lights fully
      const pos = (at / SPEC_TOTAL) * 0.92;
      const lit = interpolate(scanP, [pos, pos + 0.05], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      if (firstLit === null) firstLit = lit;
      if (lit > 0.5) litValues.add(tok);
      return (
        <span
          key={i}
          style={{
            background: `rgba(234,245,238,${lit})`,
            borderBottom: `2px solid rgba(28,122,69,${lit})`,
            color: interpolateColors(lit, [0, 1], [COLORS.foreground, COLORS.pass]),
            fontWeight: lit > 0.5 ? 600 : 400,
            borderRadius: 3,
            padding: "0 1px",
          }}
        >
          {tok}
        </span>
      );
    });
    return { tag: p.tag, nodes };
  });

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card"
      style={{ opacity: panelIn, transform: `translateY(${interpolate(panelIn, [0, 1], [16, 0])}px)` }}
    >
      <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5">
        <span className="font-mono text-xs text-muted-foreground">Specification . Detailed Description</span>
        <span className="font-mono text-[11px] text-muted-foreground">cross checked against FIG. 2</span>
      </div>
      <div className="flex-1 overflow-hidden px-4 py-4">
        {/* the band tracks the text block, not the stretched panel body */}
        <div className="relative">
          {/* the reading scan */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: 40,
              top: `calc(${scanP * 100}% - 20px)`,
              background: "linear-gradient(180deg, transparent, rgba(230,184,0,0.18), transparent)",
              opacity: interpolate(scanP, [0, 0.04, 0.92, 1], [0, 1, 1, 0]),
            }}
          />
          {paras.map((p) => (
            <p
              key={p.tag}
              className="mb-3 whitespace-pre-wrap font-mono text-[15px] leading-relaxed text-foreground/90"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              <span className="text-muted-foreground">{p.tag} </span>
              {p.nodes}
            </p>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between border-t px-4 py-3.5">
        {/* rides the first numeral's own highlight so a green mark never sits
            beside a zero tally */}
        <div className="flex items-center gap-2" style={{ opacity: firstLit ?? 0 }}>
          <SignalMark signal="green" />
          <span className="text-[15px] font-medium text-foreground">{litValues.size} of 5 matched in the description</span>
        </div>
        <div className="flex items-center gap-2" style={{ opacity: missT }}>
          <SignalMark signal="red" />
          <span className="text-[15px] font-medium text-violation">4 never mentioned</span>
        </div>
      </div>
    </div>
  );
}

// Beat 3 - the drawing check. A patent figure with several reference numerals the
// specification never introduces, each circled in red. It reads your drawings too.
export function Drawings() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Scene
      // headline, onto the figure as the circles draw, up to the findings, then
      // down to the specification as the scan reads it
      hue={[
        { f: 0, x: 50, y: 14 },
        { f: 20, x: 50, y: 14 },
        { f: 52, x: 30, y: 52 },
        { f: 96, x: 30, y: 56 },
        { f: 118, x: 72, y: 30 },
        { f: 140, x: 72, y: 32 },
        { f: 170, x: 74, y: 66 },
        { f: 215, x: 74, y: 66 },
      ]}
    >
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
              {/* flagged numerals, each circle centered on its numeral */}
              {FLAGGED.map((f) => (
                <g key={f.n}>
                  <line x1={f.px} y1={f.py} x2={f.nx} y2={f.ny} stroke={G} strokeWidth={1.2} />
                  <DrawOnCircle cx={f.nx} cy={f.ny} r={20} delay={f.delay} />
                  <text x={f.nx} y={f.ny} textAnchor="middle" dominantBaseline="central" fill={COLORS.violation} fontSize={17} fontFamily="monospace" fontWeight={700}>
                    {f.n}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* the findings + the description they were checked against */}
          <div style={{ flex: 0.85, display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center gap-2">
                <SignalMark signal="green" />
                <span className="text-[17px] font-medium text-muted-foreground">
                  Described in the specification
                </span>
              </div>
              <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10 }}>
                {["100", "102", "104", "106", "110"].map((n) => (
                  <span
                    key={n}
                    className="rounded-lg border border-pass bg-pass-bg px-3 py-1.5 font-mono text-[17px] font-medium text-pass"
                  >
                    {n}
                  </span>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-2 border-t pt-5">
                <SignalMark signal="red" />
                <span className="text-[20px] font-semibold text-foreground">
                  4 reference numerals not in the specification
                </span>
              </div>
              <p className="mt-2 text-[15px] text-muted-foreground">
                They appear in the drawing but are never described
              </p>
              <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 10 }}>
                {FLAGGED.map((f) => {
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
                  A reference character has to appear in both the drawing and the description
                </p>
              </div>
            </div>
            <SpecCrossCheck />
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
