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
import { AnnotatedEditor } from "@visual/annotated-editor";
import { SignalBadge } from "@visual/signal";
import type { VisualSpan } from "@visual/types";

// The named checks Pincite ran on the claims: most pass, two fail (the violations).
// Each leads with a plain-language label so a non-expert reads it, with the rule's
// term of art as a quiet subline (the two failing labels match the Clerical glosses).
const CHECKS = [
  { name: "Claims numbered in order", sub: "Claim numbering", ok: true },
  { name: "Terms introduced before use", sub: "Antecedent basis", ok: false },
  { name: "References point to real claims", sub: "Claim references", ok: true },
  { name: "Dependent claim format", sub: "Multiple dependent", ok: false },
  { name: "Clear, definite wording", sub: "Indefinite terms", ok: true },
  { name: "Patentable subject matter", sub: "Eligible subject matter", ok: true },
];

function Mark({ ok }: { ok: boolean }) {
  return ok ? (
    <svg viewBox="0 0 20 20" className="size-9 shrink-0">
      <circle cx="10" cy="10" r="9" fill={COLORS.pass} />
      <path d="M6 10.5l2.6 2.6 5.6-6.2" stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" className="size-9 shrink-0">
      <circle cx="10" cy="10" r="9" fill={COLORS.violation} />
      <path d="M6.6 6.6l6.8 6.8M13.4 6.6l-6.8 6.8" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

const CLAIMS =
  "3. The container of claim 1, wherein the ridges are arranged concentrically.\n" +
  "4. The container of claim 1, wherein said openings direct moisture away from the food item.\n" +
  "5. The container of claims 1 and 2, wherein the base and the lid nest with a second container.";
const sAnte = CLAIMS.indexOf("said openings");
const s12 = CLAIMS.indexOf("claims 1 and 2");
const SPANS: VisualSpan[] = [
  { start: sAnte, end: sAnte + "said openings".length, signal: "red", flagId: "ante" },
  { start: s12, end: s12 + "claims 1 and 2".length, signal: "red", flagId: "md" },
];
const FINDINGS = [
  { area: "Claims", title: "Claim 4 points to openings that were never introduced", tag: "Antecedent basis . MPEP 2173.05(e)" },
  { area: "Claims", title: "Claim 5 joins claims with and where the rule requires or", tag: "Multiple dependent claim . MPEP 608.01(n)" },
];

// Beat 1 - the catch (landscape, filled frame). The two real red violations slide
// in beside a large draft, a big counter ticks the issues. Pincite finds them first.
export function Review() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const count = Math.round(
    interpolate(frame, [30, 76], [0, 2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  );
  const trackerT = interpolate(frame, [68, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Scene
      // headline, over to the issue counter as it ticks, down to the two
      // violations, then to the checks grid
      hue={[
        { f: 0, x: 50, y: 16 },
        { f: 20, x: 50, y: 16 },
        { f: 46, x: 68, y: 42 },
        { f: 68, x: 68, y: 42 },
        { f: 92, x: 50, y: 60 },
        { f: 110, x: 50, y: 60 },
        { f: 132, x: 50, y: 76 },
        { f: 165, x: 50, y: 76 },
      ]}
    >
      <AbsoluteFill className="flex-col items-center justify-center" style={{ padding: "56px 100px" }}>
        <KineticText
          text={LINES.catch}
          startFrame={4}
          className="font-serif"
          style={{ fontSize: 74, fontWeight: 700, color: COLORS.foreground }}
        />

        {/* same 1560 rail as the rows below, top edges shared, so the editor
            lines up with everything else in the scene */}
        <div style={{ marginTop: 40, display: "flex", gap: 48, alignItems: "center", width: "100%", maxWidth: 1560 }}>
          <div style={{ flex: 1.15 }}>
            <AnnotatedEditor
              text={CLAIMS}
              spans={SPANS}
              activeFlagId={frame > 46 ? "md" : "ante"}
              progress={1}
              caption="US 2012 0024859 A1 . Claims"
              className="shadow-lg"
            />
          </div>

          <div style={{ flex: 0.85 }}>
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
            <p className="mt-3 text-[20px] text-muted-foreground">Each one traces to the exact rule it breaks</p>
          </div>
        </div>

        {/* the two violations, laid horizontally right above the checks */}
        <div style={{ marginTop: 30, width: "100%", maxWidth: 1560 }} className="grid grid-cols-2 gap-4">
          {FINDINGS.map((f, i) => {
            const sp = spring({ frame: frame - (44 + i * 16), fps, config: { damping: 200 } });
            return (
              <div
                key={i}
                style={{ opacity: sp, transform: `translateY(${interpolate(sp, [0, 1], [16, 0])}px)` }}
                className="rounded-2xl border bg-card p-5 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <SignalBadge signal="red">Violation</SignalBadge>
                  <span className="text-[15px] text-muted-foreground">{f.area}</span>
                </div>
                <p className="mt-2.5 text-[22px] font-medium leading-snug text-foreground">{f.title}</p>
                <p className="mt-1.5 font-mono text-[14px] text-muted-foreground" style={{ fontFamily: "var(--font-geist-mono)" }}>{f.tag}</p>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 22, width: "100%", maxWidth: 1560, opacity: trackerT }}>
          <div className="mb-4 text-[22px] font-medium text-muted-foreground">Checks Pincite ran on the claims</div>
          <div className="grid grid-cols-3 gap-4">
            {CHECKS.map((c, i) => {
              const sp = spring({ frame: frame - (72 + i * 5), fps, config: { damping: 200 } });
              return (
                <div
                  key={c.name}
                  style={{ opacity: sp, transform: `translateY(${interpolate(sp, [0, 1], [12, 0])}px)` }}
                  className={`flex items-center gap-4 rounded-2xl border p-6 ${c.ok ? "bg-card" : "border-violation bg-violation-bg"}`}
                >
                  <Mark ok={c.ok} />
                  <span className="flex min-w-0 flex-col">
                    <span className={`text-[24px] font-medium leading-tight ${c.ok ? "text-foreground" : "text-violation"}`}>{c.name}</span>
                    <span className={`mt-0.5 text-[15px] ${c.ok ? "text-muted-foreground" : "text-violation/80"}`}>{c.sub}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </Scene>
  );
}
