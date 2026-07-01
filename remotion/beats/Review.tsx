import {
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
import type { VisualSpan } from "@visual/types";

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
  "Claim 4 refers to claim 6, which does not exist",
  "Claim 5 multiple dependent claim must be in the alternative",
];

// Beat 1 - the catch (landscape). The two real red violations slide in beside the
// draft, a counter ticks the issues found. Pincite finds them first.
export function Review({ width = 1920, height = 1080 }: { width?: number; height?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const count = Math.round(
    interpolate(frame, [44, 92], [0, 2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  );

  return (
    <Scene>
      <div style={{ position: "absolute", inset: 0, padding: "70px 100px" }}>
        <div className="text-center">
          <KineticText
            text={LINES.catch}
            startFrame={4}
            className="font-serif"
            style={{ fontSize: 68, fontWeight: 700, color: COLORS.foreground }}
          />
        </div>

        <div style={{ marginTop: 56, display: "flex", gap: 40, alignItems: "flex-start" }}>
          <div style={{ flex: 1.15 }}>
            <AnnotatedEditor
              text={CLAIMS}
              spans={SPANS}
              activeFlagId={frame > 60 ? "md" : "c6"}
              progress={1}
              caption="US 2012 0024859 A1 . Claims"
              className="shadow-md"
            />
          </div>

          <div style={{ flex: 0.85 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
              <span
                className="font-serif"
                style={{ fontSize: 88, fontWeight: 700, color: COLORS.violation, lineHeight: 1 }}
              >
                {count}
              </span>
              <span className="text-muted-foreground" style={{ fontSize: 26 }}>
                issues found
              </span>
            </div>
            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 14 }}>
              {FINDINGS.map((t, i) => {
                const sp = spring({ frame: frame - (58 + i * 22), fps, config: { damping: 200 } });
                return (
                  <div
                    key={i}
                    style={{ opacity: sp, transform: `translateX(${interpolate(sp, [0, 1], [44, 0])}px)` }}
                    className="rounded-xl border bg-card p-4"
                  >
                    <SignalBadge signal="red">Violation</SignalBadge>
                    <p className="mt-2 text-[19px] font-medium text-foreground">{t}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Scene>
  );
}
