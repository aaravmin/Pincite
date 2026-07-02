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

// Beat 2 - the receipts (hero beat, landscape three columns). The flag, the real
// MPEP text, and the Law/Rule/Guidance stack, side by side. Nothing is guessed.
export function Trace() {
  const frame = useCurrentFrame();
  const f = MULTI_DEPENDENT_FINDING;

  const slide = interpolate(frame, [14, 56], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const hl = interpolate(frame, [58, 84], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subIn = interpolate(frame, [18, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const stackProgress = interpolate(frame, [80, 158], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Scene
      // headline, then across the three columns as each takes its turn - the
      // flag as the columns slide in, the MPEP text while the highlight lands
      // (58-84), the citation stack while it fills (80-158), then down to the
      // closing line
      hue={[
        { f: 0, x: 50, y: 16 },
        { f: 14, x: 50, y: 16 },
        { f: 34, x: 22, y: 50 },
        { f: 54, x: 22, y: 50 },
        { f: 66, x: 50, y: 52 },
        { f: 86, x: 50, y: 52 },
        { f: 104, x: 78, y: 52 },
        { f: 158, x: 78, y: 52 },
        { f: 178, x: 52, y: 74 },
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

        <div style={{ marginTop: 44, display: "flex", gap: 26, alignItems: "stretch", width: "100%" }}>
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

          {/* the real MPEP text */}
          <div style={{ flex: 1, opacity: slide, transform: `translateY(${interpolate(slide, [0, 1], [40, 0])}px)` }}>
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
            text="Nothing is guessed"
            startFrame={172}
            className="font-serif"
            style={{ fontSize: 40, fontWeight: 600, color: COLORS.mutedForeground }}
          />
        </div>
      </AbsoluteFill>
    </Scene>
  );
}
