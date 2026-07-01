import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { Scene } from "../components/Scene";
import { KineticText } from "../components/KineticText";
import { COLORS } from "../colors";
import { LINES } from "../theme";
import { AnnotatedEditor } from "@visual/annotated-editor";
import { SignalBadge } from "@visual/signal";
import { ComplianceTracker, type TrackerBlock } from "@visual/compliance-tracker";
import type { VisualSpan } from "@visual/types";

// The checks Pincite ran: most pass (green), two are the violations (red).
const CHECKS: TrackerBlock[] = [
  "green", "green", "red", "green", "green", "green", "green", "red", "green", "green", "green", "green",
].map((signal, i) => ({ id: `c${i}`, signal: signal as "green" | "red", label: `check ${i + 1}` }));

const CLAIMS =
  "3. The container of claim 1, wherein the ridges are arranged concentrically.\n" +
  "4. The container of claim 6, wherein the openings comprise a plurality of slots.\n" +
  "5. The container of claims 1 and 2, wherein the base and the lid nest with a second container.";
const s6 = CLAIMS.indexOf("claim 6");
const s12 = CLAIMS.indexOf("claims 1 and 2");
const SPANS: VisualSpan[] = [
  { start: s6, end: s6 + 7, signal: "red", flagId: "c6" },
  { start: s12, end: s12 + "claims 1 and 2".length, signal: "red", flagId: "md" },
];
const FINDINGS = [
  { area: "Claims", title: "Claim 4 refers to claim 6, which does not exist" },
  { area: "Claims", title: "Claim 5 multiple dependent claim must be in the alternative" },
];

// Beat 1 - the catch (landscape, filled frame). The two real red violations slide
// in beside a large draft, a big counter ticks the issues. Pincite finds them first.
export function Review({ width = 1920, height = 1080 }: { width?: number; height?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const count = Math.round(
    interpolate(frame, [30, 76], [0, 2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  );
  const trackerP = interpolate(frame, [70, 118], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const trackerT = interpolate(frame, [68, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Scene>
      <AbsoluteFill className="flex-col items-center justify-center" style={{ padding: "56px 100px" }}>
        <KineticText
          text={LINES.catch}
          startFrame={4}
          className="font-serif"
          style={{ fontSize: 74, fontWeight: 700, color: COLORS.foreground }}
        />

        <div style={{ marginTop: 44, display: "flex", gap: 48, alignItems: "center", width: "100%" }}>
          <div style={{ flex: 1.1 }}>
            <AnnotatedEditor
              text={CLAIMS}
              spans={SPANS}
              activeFlagId={frame > 46 ? "md" : "c6"}
              progress={1}
              caption="US 2012 0024859 A1 . Claims"
              className="shadow-lg"
            />
          </div>

          <div style={{ flex: 0.9 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
              <span
                className="font-serif"
                style={{ fontSize: 128, fontWeight: 700, color: COLORS.violation, lineHeight: 0.9 }}
              >
                {count}
              </span>
              <span className="text-foreground" style={{ fontSize: 34, fontWeight: 600 }}>
                issues found
              </span>
            </div>
            <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 16 }}>
              {FINDINGS.map((f, i) => {
                const sp = spring({ frame: frame - (44 + i * 18), fps, config: { damping: 200 } });
                return (
                  <div
                    key={i}
                    style={{ opacity: sp, transform: `translateX(${interpolate(sp, [0, 1], [48, 0])}px)` }}
                    className="rounded-2xl border bg-card p-5 shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <SignalBadge signal="red">Violation</SignalBadge>
                      <span className="text-[15px] text-muted-foreground">{f.area}</span>
                    </div>
                    <p className="mt-2.5 text-[22px] font-medium leading-snug text-foreground">{f.title}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 44, width: "100%", maxWidth: 1120, opacity: trackerT }}>
          <div className="mb-3 flex items-center justify-between text-[16px] text-muted-foreground">
            <span>Checks run on this draft</span>
            <span>2 of 12 flagged</span>
          </div>
          <ComplianceTracker blocks={CHECKS} progress={trackerP} showLegend={false} />
        </div>
      </AbsoluteFill>
    </Scene>
  );
}
