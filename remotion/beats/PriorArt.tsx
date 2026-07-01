import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";
import { Scene } from "../components/Scene";
import { KineticText } from "../components/KineticText";
import { COLORS } from "../colors";
import { LINES } from "../theme";
import { AnnotatedEditor } from "@visual/annotated-editor";
import { BarList } from "@visual/bar-list";
import { SignalBadge } from "@visual/signal";
import type { VisualSpan } from "@visual/types";

// Real prior art (found by search). US 5,947,321 (1999) discloses vented slots
// that release moisture from hot food - the same limitation as the Apple claim.
const YOURS = "a plurality of openings arranged to carry moisture out of the container";
const PRIOR = "elongated slots dimensioned to release moisture from the enclosed space";
const YP = "openings arranged to carry moisture";
const PP = "slots dimensioned to release moisture";
const YOUR_SPANS: VisualSpan[] = [{ start: YOURS.indexOf(YP), end: YOURS.indexOf(YP) + YP.length, signal: "yellow" }];
const PRIOR_SPANS: VisualSpan[] = [{ start: PRIOR.indexOf(PP), end: PRIOR.indexOf(PP) + PP.length, signal: "red", flagId: "exact" }];

const MATCHES = [
  { label: "US 5,947,321  .  vented food container", value: 0.85, display: "same feature", signal: "red" as const },
  { label: "US 2011/0011549  .  molded pulp containers", value: 0.57, display: "ridges overlap", signal: "yellow" as const },
  { label: "US 2006/0213916  .  molded fiber lid", value: 0.43, display: "lid overlap", signal: "yellow" as const },
];

// Beat 4 - the prior art. Your claim element set beside a prior patent, the exact
// overlap flagged red, a ranked list of similar patents. No single score, so you
// see exactly where the overlaps are and prove your invention is new.
export function PriorArt({ width = 1920, height = 1080 }: { width?: number; height?: number }) {
  const frame = useCurrentFrame();

  const slide = interpolate(frame, [22, 84], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const barProgress = interpolate(frame, [104, 196], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const badge = interpolate(frame, [84, 108], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Scene>
      <AbsoluteFill className="flex-col items-center justify-center" style={{ padding: "50px 100px" }}>
        <div className="w-full text-center">
          <KineticText
            text={LINES.priorart}
            startFrame={4}
            className="font-serif"
            style={{ fontSize: 66, fontWeight: 700, color: COLORS.foreground }}
          />
          <p className="mt-2 text-[22px] text-muted-foreground">{LINES.priorartSub}</p>
        </div>

        <div style={{ marginTop: 40, display: "flex", gap: 28, alignItems: "flex-start", width: "100%" }}>
          <div style={{ flex: 1, opacity: slide, transform: `translateX(${interpolate(slide, [0, 1], [-40, 0])}px)` }}>
            <AnnotatedEditor text={YOURS} spans={YOUR_SPANS} progress={1} caption="Your claim . element 1" />
          </div>
          <div style={{ flex: 1, opacity: slide, transform: `translateX(${interpolate(slide, [0, 1], [40, 0])}px)` }}>
            <AnnotatedEditor text={PRIOR} spans={PRIOR_SPANS} activeFlagId="exact" progress={1} caption="US 5,947,321 . vented food container" />
            <div style={{ marginTop: 12, opacity: badge }}>
              <SignalBadge signal="red">Same feature already in prior art</SignalBadge>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 34, width: "100%", maxWidth: 1180 }} className="rounded-xl border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[19px] font-semibold text-foreground">Overlap with prior patents</h3>
            <span className="text-[14px] text-muted-foreground">A similarity signal, not a novelty verdict</span>
          </div>
          <BarList items={MATCHES} progress={barProgress} />
          <p className="mt-4 text-[15px] text-muted-foreground">
            No single score, you see exactly where you overlap and decide
          </p>
        </div>
      </AbsoluteFill>
    </Scene>
  );
}
