import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  interpolateColors,
  spring,
  Easing,
} from "remotion";
import { Scene } from "../components/Scene";
import { KineticText } from "../components/KineticText";
import { COLORS } from "../colors";
import { LINES } from "../theme";

// A harder rule than a single-word deletion: antecedent basis. Claim 1 recites
// "a plurality of openings", so "said openings" has no proper antecedent - the fix
// traces the parent claim and supplies the exact element phrase.
const BEFORE = "4. The container of claim 1, wherein said openings direct moisture away from the food item.";
const AFTER = "4. The container of claim 1, wherein the plurality of openings direct moisture away from the food item.";

// Renders a diff line with the changed token highlighted.
function DiffLine({ sign, text, token, color, bg }: { sign: string; text: string; token: string; color: string; bg: string }) {
  const i = text.indexOf(token);
  return (
    <div style={{ background: bg, display: "flex", gap: 16, padding: "10px 18px", alignItems: "baseline" }}>
      <span style={{ color, fontWeight: 700, width: 14 }}>{sign}</span>
      <pre className="whitespace-pre-wrap" style={{ fontFamily: "var(--font-geist-mono)", fontSize: 22, color: COLORS.foreground, margin: 0 }}>
        {text.slice(0, i)}
        <span style={{ background: color, color: "#fff", borderRadius: 4, padding: "0 4px" }}>{token}</span>
        {text.slice(i + token.length)}
      </pre>
    </div>
  );
}

// Beat 3 - the auto fix. Pincite proposes the exact before and after, and you
// accept it. Review and apply, never a silent rewrite.
export function AutoFix({ width = 1920, height = 1080 }: { width?: number; height?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardT = spring({ frame: frame - 24, fps, config: { damping: 200 } });
  const afterT = interpolate(frame, [58, 84], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const btnT = spring({ frame: frame - 92, fps, config: { damping: 200 } });
  // the accept fires around frame 150
  const accept = interpolate(frame, [148, 176], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cursorT = interpolate(frame, [104, 146], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });

  const dot = interpolateColors(accept, [0, 1], [COLORS.violation, COLORS.pass]);
  const btnPress = interpolate(frame, [146, 152, 160], [1, 0.94, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const clickScale = interpolate(frame, [145, 150, 157], [1, 0.82, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Scene>
      <AbsoluteFill className="flex-col items-center justify-center" style={{ padding: "56px 100px" }}>
        <KineticText
          text={LINES.autofix}
          startFrame={4}
          className="font-serif"
          style={{ fontSize: 68, fontWeight: 700, color: COLORS.foreground }}
        />

        <div
          style={{ width: 1180, marginTop: 44, opacity: cardT, transform: `translateY(${interpolate(cardT, [0, 1], [30, 0])}px)` }}
          className="overflow-hidden rounded-2xl border bg-card shadow-md"
        >
          <div className="flex items-center gap-2 border-b bg-muted/40 px-5 py-3">
            <span className="flex gap-1.5" aria-hidden>
              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
            </span>
            <span className="ml-1 font-mono text-sm text-muted-foreground">US 2012 0024859 A1 . Claim 4 . proposed fix</span>
          </div>
          <div className="divide-y">
            <DiffLine sign="−" text={BEFORE} token="said openings" color={COLORS.violation} bg={COLORS.violationBg} />
            <div style={{ opacity: afterT }}>
              <DiffLine sign="+" text={AFTER} token="the plurality of openings" color={COLORS.pass} bg={COLORS.passBg} />
            </div>
          </div>

          {/* finding + actions */}
          <div className="flex items-center justify-between gap-4 border-t px-5 py-4">
            <div className="flex items-center gap-3">
              <span style={{ width: 13, height: 13, borderRadius: 999, background: dot, display: "inline-block" }} />
              <span className="text-[18px] font-medium text-foreground">Claim 4 lacks antecedent basis for said openings</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: interpolateColors(accept, [0, 1], [COLORS.mutedForeground, COLORS.pass]) }}>
                {accept > 0.5 ? "Resolved" : ""}
              </span>
            </div>
            <div style={{ opacity: btnT, display: "flex", gap: 10, position: "relative" }}>
              <div className="rounded-lg border px-4 py-2 text-[16px] font-medium text-muted-foreground">Reject</div>
              <div
                style={{ transform: `scale(${btnPress})`, background: accept > 0.5 ? COLORS.pass : COLORS.foreground }}
                className="rounded-lg px-4 py-2 text-[16px] font-medium text-background"
              >
                {accept > 0.5 ? "Applied" : "Accept fix"}
              </div>
              {/* cursor lands on the Accept fix button */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  right: interpolate(cursorT, [0, 1], [-52, 26]),
                  top: interpolate(cursorT, [0, 1], [64, 12]),
                  transform: `scale(${clickScale})`,
                  transformOrigin: "top left",
                  opacity: interpolate(frame, [104, 118, 160, 172], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                }}
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                  <path d="M4 2 L4 20 L9 15 L12 22 L15 21 L12 14 L19 14 Z" fill={COLORS.foreground} stroke="#fff" strokeWidth={1.2} />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-[22px] text-muted-foreground">You review every change, nothing is rewritten on its own</p>
      </AbsoluteFill>
    </Scene>
  );
}
