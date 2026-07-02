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
import { AnnotatedEditor } from "@visual/annotated-editor";
import { CitationStack } from "@visual/citation-stack";
import { SignalBadge } from "@visual/signal";
import { MULTI_DEPENDENT_FINDING } from "@visual/fixtures/apple-example";
import type { VisualSpan } from "@visual/types";

// The same multiple dependent claim the rest of the film flags (claim 5 joins
// "claims 1 and 2" with "and" where the rule requires "or"), so the receipts beat
// traces a violation the viewer has already seen. Verbatim public claim text.
const CLAIM_5 =
  "5. The container of claims 1 and 2, wherein the base and the lid are shaped to nest with a second container.";
const cStart = CLAIM_5.indexOf("claims 1 and 2");
const CLAIM_5_SPANS: VisualSpan[] = [
  { start: cStart, end: cStart + "claims 1 and 2".length, signal: "red", flagId: "multi-dependent" },
];

// Verbatim MPEP 608.01(n), the rule the claim breaks. The highlight lands on the
// operative clause ("in the alternative only") that the claim's "and" violates.
const MPEP_TEXT =
  "A claim in multiple dependent form shall contain a reference, in the alternative only, to more than one claim previously set forth and then specify a further limitation of the subject matter claimed. A multiple dependent claim shall not serve as a basis for any other multiple dependent claim.";
const HL_END = MPEP_TEXT.indexOf("in the alternative only,") + "in the alternative only,".length;

// Beat 2 - the receipts (hero beat, landscape three columns). The flag, then the
// Law/Rule/Guidance stack, then the real MPEP text opened from the Guidance card
// by a soft connector. Nothing is guessed.
export function Trace() {
  const frame = useCurrentFrame();
  const f = MULTI_DEPENDENT_FINDING;

  // (1) claim + violation slide in on the left.
  const slide = interpolate(frame, [10, 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const subIn = interpolate(frame, [12, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // (2) the Law / Rule / Guidance stack fills in the middle.
  const stackProgress = interpolate(frame, [34, 78], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // (3) the connector draws in from the Guidance card toward the opened text.
  const connect = interpolate(frame, [78, 98], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  // (4) the MPEP text panel opens on the right (fade + scale from 0.97 to 1) as
  // the connector arrives, and its yellow highlight lands on the operative clause.
  const openText = interpolate(frame, [90, 116], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const hl = interpolate(frame, [104, 124], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Scene
      // headline, onto the flag as it slides in, over to the Law/Rule/Guidance
      // stack as it fills (34-78), then rightward as the connector opens the
      // MPEP text (78-124), then down to the closing line
      hue={[
        { f: 0, x: 50, y: 16 },
        { f: 10, x: 50, y: 16 },
        { f: 26, x: 22, y: 50 },
        { f: 40, x: 22, y: 50 },
        { f: 56, x: 50, y: 52 },
        { f: 74, x: 50, y: 52 },
        { f: 96, x: 80, y: 52 },
        { f: 124, x: 80, y: 52 },
        { f: 140, x: 52, y: 74 },
      ]}
    >
      <AbsoluteFill className="flex-col items-center justify-center" style={{ padding: "50px 90px" }}>
        <div className="text-center">
          <KineticText
            text={LINES.receipts}
            startFrame={4}
            className="font-serif"
            style={{ fontSize: 68, fontWeight: 700, color: COLORS.foreground }}
          />
          <p className="mt-2 text-[22px] text-muted-foreground" style={{ opacity: subIn }}>{LINES.receiptsSub}</p>
        </div>

        <div style={{ position: "relative", marginTop: 44, display: "flex", gap: 26, alignItems: "stretch", width: "100%" }}>
          {/* the flag */}
          <div
            style={{ flex: 1, opacity: slide, transform: `translateX(${interpolate(slide, [0, 1], [-50, 0])}px)` }}
          >
            <AnnotatedEditor
              text={CLAIM_5}
              spans={CLAIM_5_SPANS}
              activeFlagId="multi-dependent"
              progress={1}
              caption="US 2012 0024859 A1 . Claim 5"
            />
            <div className="mt-4 rounded-xl border bg-card p-4">
              <SignalBadge signal="red">Violation</SignalBadge>
              <p className="mt-2 text-[17px] font-medium text-foreground">{f.title}</p>
            </div>
          </div>

          {/* the Law / Rule / Guidance stack - the Guidance card (bottom) opens
              into the MPEP text on the right */}
          <div style={{ flex: 1, transform: `translateX(${interpolate(slide, [0, 1], [-30, 0])}px)`, opacity: slide }}>
            <CitationStack
              law={f.citation.law}
              cfr={f.citation.cfr}
              mpep={f.citation.mpep}
              // Guidance reads a plain line here (the verbatim MPEP text opens on
              // the right), and the standalone helper line under the stack is
              // hidden.
              guidance="The guidebook explaining the rule and law"
              excerpt={undefined}
              helperLine=""
              progress={stackProgress}
            />
          </div>

          {/* the connector: a soft tapered warm beam that draws out of the
              Guidance card (bottom of the middle stack) and leads into the opened
              MPEP text. It lives in the gap between the two columns, anchored to
              the Guidance card's vertical position. Not a clip-art arrow - a
              smooth curved wedge with rounded ends and a low-opacity warm
              gradient, so the reference reads as expanding into the exact text. */}
          <TraceConnector connect={connect} attention={COLORS.attention} />

          {/* the opened MPEP text - the focal element, given a touch more width.
              It fades and scales in slightly as the connector arrives, so it
              reads as being opened rather than always sitting there. */}
          <div
            style={{
              flex: 1.15,
              opacity: openText,
              transform: `scale(${interpolate(openText, [0, 1], [0.97, 1])})`,
              transformOrigin: "left center",
            }}
          >
            <div className="h-full overflow-hidden rounded-xl border bg-card">
              <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5">
                <span className="font-mono text-xs text-muted-foreground">MPEP 608.01(n) . Multiple Dependent Claims</span>
                <span className="font-mono text-[11px] text-muted-foreground">USPTO</span>
              </div>
              <pre
                className="whitespace-pre-wrap px-4 py-4 font-mono text-[15px] leading-relaxed text-foreground/90"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                <mark
                  style={{
                    background: hl > 0 ? `rgba(230, 184, 0, ${0.3 * hl})` : "transparent",
                    borderBottom: hl > 0 ? `2px solid ${COLORS.attention}` : "none",
                    color: "inherit",
                  }}
                >
                  {MPEP_TEXT.slice(0, HL_END)}
                </mark>
                {MPEP_TEXT.slice(HL_END)}
              </pre>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 34 }}>
          <KineticText
            text="Nothing is guessed"
            startFrame={118}
            className="font-serif"
            style={{ fontSize: 40, fontWeight: 600, color: COLORS.mutedForeground }}
          />
        </div>
      </AbsoluteFill>
    </Scene>
  );
}

// A seamless connector between the Guidance card (bottom of the middle stack) and
// the opened MPEP text on the right. It spans the gutter between the two columns,
// aligned to the Guidance card's vertical center, and overhangs slightly onto both
// cards so it visually joins them (no floating stray line). Rather than a hard
// clip-art arrow, it is a soft beam with rounded ends and a low-opacity warm
// gradient - narrow and faint where it leaves the Guidance card, opening into a
// rounded mouth as it reaches the text - so the reference reads as expanding into
// the exact text as `connect` goes 0 to 1.
function TraceConnector({ connect, attention }: { connect: number; attention: string }) {
  if (connect <= 0) return null;
  const W = 116;
  const H = 46;
  // reveal the beam left-to-right (out of the Guidance card, into the text)
  const reveal = connect;
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        // ~64% of the row width sits in the gutter between the middle stack and
        // the right panel; ~82% of the row height lands on the Guidance card (the
        // bottom card of the stack). The extra width overhangs onto both cards so
        // it visually joins them.
        left: "64%",
        top: "82%",
        width: W,
        height: H,
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 5,
      }}
    >
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="trace-beam" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={attention} stopOpacity="0.06" />
            <stop offset="1" stopColor={attention} stopOpacity="0.38" />
          </linearGradient>
          <clipPath id="trace-beam-clip">
            <rect x="0" y="0" width={W * reveal} height={H} />
          </clipPath>
        </defs>
        <g clipPath="url(#trace-beam-clip)">
          {/* the beam: a soft point where it leaves the Guidance card, opening
              smoothly into a rounded mouth at the text panel */}
          <path
            d={
              `M 0 ${H / 2} ` +
              `C ${W * 0.42} ${H / 2}, ${W * 0.58} 6, ${W - 4} 6 ` +
              `Q ${W} 6, ${W} 12 ` +
              `L ${W} ${H - 12} ` +
              `Q ${W} ${H - 6}, ${W - 4} ${H - 6} ` +
              `C ${W * 0.58} ${H - 6}, ${W * 0.42} ${H / 2}, 0 ${H / 2} Z`
            }
            fill="url(#trace-beam)"
          />
          {/* a soft centered guide line, rounded, flowing left-to-right */}
          <path
            d={`M 3 ${H / 2} L ${W - 3} ${H / 2}`}
            stroke={attention}
            strokeOpacity="0.45"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          {/* a soft node where it leaves the Guidance card, so the origin reads */}
          <circle cx="3" cy={H / 2} r="3.5" fill={attention} fillOpacity="0.4" />
        </g>
      </svg>
    </div>
  );
}
