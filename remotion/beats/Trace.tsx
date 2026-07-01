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
import { CitationStack } from "@visual/citation-stack";
import { SignalBadge } from "@visual/signal";
import { CLAIM6_FINDING } from "@visual/fixtures/apple-example";
import type { VisualSpan } from "@visual/types";

const CLAIM_4 =
  "4. The container of claim 6, wherein the plurality of openings comprise a plurality of slots.";
const cStart = CLAIM_4.indexOf("claim 6");
const CLAIM_4_SPANS: VisualSpan[] = [
  { start: cStart, end: cStart + 7, signal: "red", flagId: "claim-6" },
];

const MPEP_TEXT =
  "One or more claims may be presented in dependent form, referring back to and further limiting another claim or claims in the same application. A claim in dependent form shall contain a reference to a claim previously set forth and then specify a further limitation of the subject matter claimed.";
const HL_END = MPEP_TEXT.indexOf("same application.") + "same application.".length;

// Beat 2 - the receipts (hero beat, landscape three columns). The flag, the real
// MPEP text, and the Law/Rule/Guidance stack, side by side. Nothing is guessed.
export function Trace({ width = 1920, height = 1080 }: { width?: number; height?: number }) {
  const frame = useCurrentFrame();
  const f = CLAIM6_FINDING;

  const slide = interpolate(frame, [22, 88], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const hl = interpolate(frame, [92, 128], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const stackProgress = interpolate(frame, [120, 250], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Scene>
      <AbsoluteFill className="flex-col items-center justify-center" style={{ padding: "50px 90px" }}>
        <div className="text-center">
          <KineticText
            text={LINES.receipts}
            startFrame={4}
            className="font-serif"
            style={{ fontSize: 68, fontWeight: 700, color: COLORS.foreground }}
          />
        </div>

        <div style={{ marginTop: 44, display: "flex", gap: 26, alignItems: "stretch", width: "100%" }}>
          {/* the flag */}
          <div
            style={{ flex: 1, opacity: slide, transform: `translateX(${interpolate(slide, [0, 1], [-50, 0])}px)` }}
          >
            <AnnotatedEditor
              text={CLAIM_4}
              spans={CLAIM_4_SPANS}
              activeFlagId="claim-6"
              progress={1}
              caption="US 2012 0024859 A1 . Claim 4"
            />
            <div className="mt-4 rounded-xl border bg-card p-4">
              <SignalBadge signal="red">Violation</SignalBadge>
              <p className="mt-2 text-[17px] font-medium text-foreground">{f.title}</p>
            </div>
          </div>

          {/* the real MPEP text */}
          <div style={{ flex: 1, opacity: slide, transform: `translateY(${interpolate(slide, [0, 1], [40, 0])}px)` }}>
            <div className="h-full overflow-hidden rounded-xl border bg-card">
              <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5">
                <span className="font-mono text-xs text-muted-foreground">MPEP 608.01(n) . Dependent Claims</span>
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

          {/* the Law / Rule / Guidance stack */}
          <div style={{ flex: 1, transform: `translateX(${interpolate(slide, [0, 1], [50, 0])}px)`, opacity: slide }}>
            <CitationStack
              law={f.citation.law}
              cfr={f.citation.cfr}
              mpep={f.citation.mpep}
              guidance={f.citation.guidance}
              excerpt={f.citation.excerpt}
              progress={stackProgress}
            />
          </div>
        </div>

        <div style={{ marginTop: 34 }}>
          <KineticText
            text="Nothing is guessed."
            startFrame={220}
            className="font-serif"
            style={{ fontSize: 40, fontWeight: 600, color: COLORS.mutedForeground }}
          />
        </div>
      </AbsoluteFill>
    </Scene>
  );
}
