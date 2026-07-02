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
import { BarList } from "@visual/bar-list";
import { SignalBadge } from "@visual/signal";

// Real prior art (found by search). US 5,947,321 (1999) discloses vented slots
// that release moisture from hot food - the same limitation as the Apple claim.
const yellowMark = {
  background: "rgba(230, 184, 0, 0.30)",
  borderBottom: `2px solid ${COLORS.attention}`,
  color: COLORS.foreground,
  fontWeight: 600,
  borderRadius: 3,
  padding: "0 4px",
} as const;
const redMark = {
  background: COLORS.violationBg,
  borderBottom: `2px solid ${COLORS.violation}`,
  color: COLORS.violation,
  fontWeight: 600,
  borderRadius: 3,
  padding: "0 4px",
} as const;

const MATCHES = [
  { label: "US 5,947,321  .  vented food container", value: 0.85, display: "moisture venting", signal: "red" as const },
  { label: "US 2011/0011549  .  molded pulp containers", value: 0.57, display: "ridge pattern", signal: "yellow" as const },
  { label: "US 2006/0213916  .  molded fiber lid", value: 0.43, display: "lid geometry", signal: "yellow" as const },
];

// Beat 4 - the prior art. Your limitation stacked over the prior patent that
// already discloses it, the overlap highlighted, then a plain-language reason it
// matters (no vague pill). A ranked list shows where else you overlap.
export function PriorArt() {
  const frame = useCurrentFrame();

  const leftIn = interpolate(frame, [18, 62], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const priorIn = interpolate(frame, [44, 84], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const explainIn = interpolate(frame, [78, 104], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rightIn = interpolate(frame, [34, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const barProgress = interpolate(frame, [104, 196], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Scene
      // headline, onto your claim, down to the prior patent, onto the violation
      // banner as it lands, then over to the ranked overlap list as bars fill
      hue={[
        { f: 0, x: 50, y: 14 },
        { f: 22, x: 50, y: 14 },
        { f: 50, x: 32, y: 40 },
        { f: 78, x: 32, y: 52 },
        { f: 100, x: 50, y: 80 },
        { f: 118, x: 50, y: 80 },
        { f: 140, x: 76, y: 46 },
        { f: 190, x: 76, y: 48 },
        { f: 215, x: 60, y: 60 },
      ]}
    >
      <AbsoluteFill className="flex-col items-center justify-center" style={{ padding: "44px 90px" }}>
        <div className="w-full text-center">
          <KineticText
            text={LINES.priorart}
            startFrame={4}
            className="font-serif"
            style={{ fontSize: 62, fontWeight: 700, color: COLORS.foreground }}
          />
          <p className="mt-2 text-[22px] text-muted-foreground">{LINES.priorartSub}</p>
        </div>

        {/* two cards (your claim + the ranked list) share a top edge, and the
            violation reads full width across the bottom, spanning both */}
        <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 22, width: "100%", maxWidth: 1480 }}>
          <div style={{ display: "flex", gap: 26, alignItems: "stretch" }}>
            {/* LEFT: the overlap, made explicit and readable */}
            <div style={{ flex: 1.4 }} className="rounded-2xl border bg-card p-7">
              {/* your claim */}
              <div style={{ opacity: leftIn, transform: `translateY(${interpolate(leftIn, [0, 1], [16, 0])}px)` }}>
                <div className="mb-2 flex items-center gap-2.5">
                  <span className="rounded-md bg-foreground px-2.5 py-1 text-[15px] font-semibold text-background">Your claim</span>
                  <span className="text-[15px] text-muted-foreground">a line from your draft</span>
                </div>
                <p className="text-[25px] font-medium leading-snug text-foreground">
                  a plurality of <span style={yellowMark}>openings arranged to carry moisture</span> out of the container
                </p>
              </div>

              {/* connector */}
              <div className="my-5 flex items-center gap-4" style={{ opacity: priorIn }}>
                <div className="h-px flex-1 bg-border" />
                <span className="text-[16px] font-medium text-muted-foreground">already described in a granted patent</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* the prior patent */}
              <div style={{ opacity: priorIn, transform: `translateY(${interpolate(priorIn, [0, 1], [16, 0])}px)` }}>
                <div className="mb-2 flex items-center gap-2.5">
                  <span className="rounded-md border px-2.5 py-1 font-mono text-[15px] font-semibold text-foreground">US 5,947,321</span>
                  <span className="text-[15px] text-muted-foreground">Vented food container, granted 1999</span>
                </div>
                <p className="text-[25px] font-medium leading-snug text-foreground">
                  elongated <span style={redMark}>slots dimensioned to release moisture</span> from the enclosed space
                </p>
              </div>
            </div>

            {/* RIGHT: where else you overlap, ranked - top aligned with the left */}
            <div
              style={{ flex: 1, opacity: rightIn, transform: `translateX(${interpolate(rightIn, [0, 1], [40, 0])}px)` }}
              className="flex flex-col rounded-2xl border bg-card p-7"
            >
              <div className="mb-4">
                <h3 className="text-[20px] font-semibold text-foreground">Overlap with prior patents</h3>
                <span className="text-[14px] text-muted-foreground">Where your draft overlaps what already exists</span>
              </div>
              <BarList items={MATCHES} progress={barProgress} />
              <p className="mt-5 text-[15px] text-muted-foreground">
                No single score, you see exactly where you overlap and decide
              </p>
            </div>
          </div>

          {/* the violation, full width across the bottom: it is a near-identical
              overlap - the same feature in different words */}
          <div
            style={{ opacity: explainIn, transform: `translateY(${interpolate(explainIn, [0, 1], [14, 0])}px)` }}
            className="flex items-center gap-6 rounded-2xl border border-violation bg-violation-bg px-6 py-5"
          >
            <div className="flex shrink-0 flex-col items-start gap-2">
              <SignalBadge signal="red">Violation</SignalBadge>
              <div className="text-[26px] font-bold leading-tight text-violation">Almost a direct overlap</div>
            </div>
            <div className="h-16 w-px shrink-0 bg-violation/25" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="rounded-md border bg-card px-2.5 py-1 text-[16px] font-medium text-foreground">openings to carry moisture</span>
                <span className="text-[22px] font-bold text-foreground">≈</span>
                <span className="rounded-md border bg-card px-2.5 py-1 text-[16px] font-medium text-foreground">slots to release moisture</span>
                <span className="text-[15px] text-muted-foreground">the same feature, worded differently</span>
              </div>
              <p className="mt-2.5 text-[17px] leading-snug text-foreground">
                A patent from 1999 already covers this feature, so it cannot be what makes yours new. Narrow it, or lean on what is genuinely different.
              </p>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </Scene>
  );
}
