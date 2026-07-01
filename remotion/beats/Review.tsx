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
import type { VisualSpan } from "@visual/types";

// The named checks Pincite ran on the claims: most pass, two fail (the violations).
const CHECKS = [
  { name: "Claim numbering", ok: true },
  { name: "Antecedent basis", ok: true },
  { name: "Dependency form", ok: true },
  { name: "Multiple dependent", ok: false },
  { name: "Indefinite terms", ok: false },
  { name: "Eligibility 101", ok: true },
];

function Mark({ ok }: { ok: boolean }) {
  return ok ? (
    <svg viewBox="0 0 20 20" className="size-6 shrink-0">
      <circle cx="10" cy="10" r="9" fill={COLORS.pass} />
      <path d="M6 10.5l2.6 2.6 5.6-6.2" stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" className="size-6 shrink-0">
      <circle cx="10" cy="10" r="9" fill={COLORS.violation} />
      <path d="M6.6 6.6l6.8 6.8M13.4 6.6l-6.8 6.8" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

const CLAIMS =
  "3. The container of claim 1, wherein the ridges are arranged substantially concentrically.\n" +
  "4. The container of claim 1, wherein the openings comprise a plurality of slots.\n" +
  "5. The container of claims 1 and 2, wherein the base and the lid nest with a second container.";
const sSub = CLAIMS.indexOf("substantially");
const s12 = CLAIMS.indexOf("claims 1 and 2");
const SPANS: VisualSpan[] = [
  { start: sSub, end: sSub + "substantially".length, signal: "red", flagId: "rel" },
  { start: s12, end: s12 + "claims 1 and 2".length, signal: "red", flagId: "md" },
];
const FINDINGS = [
  { area: "Claims", title: "Claim 3 uses the relative term substantially, which is indefinite" },
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
              activeFlagId={frame > 46 ? "md" : "rel"}
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

        <div style={{ marginTop: 44, width: "100%", maxWidth: 1180, opacity: trackerT }}>
          <div className="mb-3 text-[16px] font-medium text-muted-foreground">Checks Pincite ran on the claims</div>
          <div className="grid grid-cols-3 gap-3">
            {CHECKS.map((c, i) => {
              const sp = spring({ frame: frame - (72 + i * 5), fps, config: { damping: 200 } });
              return (
                <div
                  key={c.name}
                  style={{ opacity: sp, transform: `translateY(${interpolate(sp, [0, 1], [12, 0])}px)` }}
                  className={`flex items-center gap-3 rounded-xl border p-4 ${c.ok ? "bg-card" : "border-violation bg-violation-bg"}`}
                >
                  <Mark ok={c.ok} />
                  <span className={`text-[19px] font-medium ${c.ok ? "text-foreground" : "text-violation"}`}>{c.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </Scene>
  );
}
