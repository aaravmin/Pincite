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
import { SignalBadge } from "@visual/signal";

// The offending token, marked in the same red style the prior-art beat uses.
const redMark = {
  background: COLORS.violationBg,
  borderBottom: `2px solid ${COLORS.violation}`,
  color: COLORS.violation,
  fontWeight: 600,
  borderRadius: 3,
  padding: "0 3px",
} as const;

// The three most common ways a real application gets bounced: a wording slip that
// breaks antecedent basis, a dependent-claim formatting rule, and a drawing numeral
// that never made it into the text. All three are violations (red).
const G = COLORS.mutedForeground;

// Card wrapper - top row (badge + label), a middle slot, and a plain-language gloss.
function Card({
  frame,
  fps,
  delay,
  label,
  middle,
  gloss,
}: {
  frame: number;
  fps: number;
  delay: number;
  label: string;
  middle: React.ReactNode;
  gloss: React.ReactNode;
}) {
  const sp = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return (
    <div
      style={{ flex: 1, opacity: sp, transform: `translateY(${interpolate(sp, [0, 1], [24, 0])}px)` }}
      className="rounded-2xl border bg-card p-6"
    >
      <div className="flex items-center gap-2">
        <SignalBadge signal="red">Violation</SignalBadge>
        <span className="text-[15px] text-muted-foreground">{label}</span>
      </div>
      <div className="mt-4">{middle}</div>
      <p className="mt-4 text-[22px] font-medium leading-snug text-foreground">{gloss}</p>
    </div>
  );
}

// A mono snippet box with an offending token marked red.
function Snippet({ before, token, after }: { before: string; token: string; after: string }) {
  return (
    <div
      className="rounded-lg bg-muted/40 p-4 leading-relaxed text-foreground"
      style={{ fontFamily: "var(--font-geist-mono)", fontSize: 20 }}
    >
      {before}
      <span style={redMark}>{token}</span>
      {after}
    </div>
  );
}

// Beat 2 - the first problem made concrete. Three real clerical mistakes, each a
// violation, each glossed in plain language. Any one can sink the application.
export function Clerical() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Scene
      // headline, across the three cards left to right, then down to the footer
      hue={[
        { f: 0, x: 50, y: 14 },
        { f: 24, x: 50, y: 14 },
        { f: 48, x: 24, y: 48 },
        { f: 70, x: 50, y: 48 },
        { f: 96, x: 76, y: 48 },
        { f: 150, x: 50, y: 76 },
        { f: 225, x: 50, y: 76 },
      ]}
    >
      <AbsoluteFill className="flex-col items-center justify-center" style={{ padding: "56px 100px" }}>
        <div className="text-center">
          <KineticText
            text={LINES.clerical}
            startFrame={4}
            className="font-serif"
            style={{ fontSize: 74, fontWeight: 700, color: COLORS.foreground }}
          />
        </div>

        <div style={{ marginTop: 44, display: "flex", gap: 26, alignItems: "stretch", width: "100%", maxWidth: 1560 }}>
          <Card
            frame={frame}
            fps={fps}
            delay={26}
            label="A wording slip"
            middle={<Snippet before="wherein " token="said openings" after=" direct moisture away from the food item" />}
            gloss="Points to openings that were never introduced"
          />

          <Card
            frame={frame}
            fps={fps}
            delay={48}
            label="A formatting rule"
            middle={<Snippet before="The container of " token="claims 1 and 2" after=", wherein the base and the lid nest" />}
            gloss={
              <>
                Joins claims with <em>and</em> where the rule requires <em>or</em>
              </>
            }
          />

          <Card
            frame={frame}
            fps={fps}
            delay={70}
            label="A drawing mismatch"
            middle={
              <div className="flex items-center gap-4">
                <span
                  className="rounded-lg border border-violation bg-violation-bg px-4 py-2 font-mono font-bold text-violation"
                  style={{ fontFamily: "var(--font-geist-mono)", fontSize: 26 }}
                >
                  203
                </span>
                <svg width="120" height="56" viewBox="0 0 120 56" aria-hidden>
                  <line x1={4} y1={14} x2={70} y2={14} stroke={G} strokeWidth={1.4} />
                  <line x1={4} y1={30} x2={92} y2={30} stroke={G} strokeWidth={1.4} />
                  <line x1={4} y1={46} x2={54} y2={46} stroke={G} strokeWidth={1.4} />
                </svg>
              </div>
            }
            gloss="Numbered in the drawing, never explained in the text"
          />
        </div>

        <div className="mt-12 text-center">
          <KineticText
            text={LINES.clericalFoot1}
            startFrame={150}
            className="font-serif"
            style={{ fontSize: 44, fontWeight: 600, color: COLORS.foreground }}
          />
          <div className="mt-3">
            <KineticText
              text={LINES.clericalFoot2}
              startFrame={174}
              className="font-serif"
              style={{ fontSize: 28, fontWeight: 500, color: COLORS.mutedForeground }}
            />
          </div>
        </div>
      </AbsoluteFill>
    </Scene>
  );
}
