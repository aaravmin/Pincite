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

// Real, verbatim 37 CFR 1.75(c) as carried in MPEP 608.01(n). The first sentence
// is the responsive passage the finding pins to.
const MPEP_TEXT =
  "One or more claims may be presented in dependent form, referring back to and further limiting another claim or claims in the same application. A claim in dependent form shall contain a reference to a claim previously set forth and then specify a further limitation of the subject matter claimed.";
const HL_END = MPEP_TEXT.indexOf("same application.") + "same application.".length;

// Beat 2 - the receipts (hero beat). Click a finding, the evidence splits in with
// the draft and the real MPEP text, then the Law/Rule/Guidance stack builds.
export function Trace({ width = 1080, height = 1350 }: { width?: number; height?: number }) {
  const frame = useCurrentFrame();
  const f = CLAIM6_FINDING;

  const slide = interpolate(frame, [26, 92], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const hl = interpolate(frame, [96, 132], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const stackProgress = interpolate(frame, [140, 320], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Scene>
      <div style={{ position: "absolute", inset: 0, padding: "70px 70px" }}>
        {/* header line */}
        <div className="text-center">
          <KineticText
            text={LINES.receipts}
            startFrame={4}
            className="font-serif"
            style={{
              fontSize: 52,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: COLORS.foreground,
            }}
          />
        </div>

        {/* split: draft claim + real MPEP text */}
        <div style={{ display: "flex", gap: 24, marginTop: 56, alignItems: "stretch" }}>
          <div
            style={{
              flex: 1,
              opacity: slide,
              transform: `translateX(${interpolate(slide, [0, 1], [-60, 0])}px)`,
            }}
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
              <p className="mt-2 text-[15px] font-medium text-foreground">{f.title}</p>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              opacity: slide,
              transform: `translateX(${interpolate(slide, [0, 1], [60, 0])}px)`,
            }}
          >
            <div className="h-full overflow-hidden rounded-xl border bg-card">
              <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5">
                <span className="font-mono text-xs text-muted-foreground">MPEP 608.01(n) . Dependent Claims</span>
                <span className="font-mono text-[11px] text-muted-foreground">USPTO</span>
              </div>
              <pre
                className="whitespace-pre-wrap px-4 py-4 font-mono text-[13px] leading-relaxed text-foreground/90"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                <mark
                  style={{
                    background:
                      hl > 0 ? `rgba(230, 184, 0, ${0.28 * hl})` : "transparent",
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

        {/* the Law / Rule / Guidance stack builds */}
        <div style={{ marginTop: 44, maxWidth: 860, marginLeft: "auto", marginRight: "auto" }}>
          <CitationStack
            law={f.citation.law}
            cfr={f.citation.cfr}
            mpep={f.citation.mpep}
            guidance={f.citation.guidance}
            excerpt={f.citation.excerpt}
            progress={stackProgress}
          />
        </div>

        {/* smaller line */}
        <AbsoluteFill className="items-center justify-end" style={{ paddingBottom: 70 }}>
          <KineticText
            text={LINES.receiptsSub}
            startFrame={268}
            className="font-serif italic"
            style={{ fontSize: 34, color: COLORS.mutedForeground }}
          />
        </AbsoluteFill>
      </div>
    </Scene>
  );
}
