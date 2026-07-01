import { cn } from "@/lib/utils";

// A realistic patent figure (cross-section, numbered leader lines) for the drawing
// check feature. The red-circled numerals appear in the drawing but not in the
// specification - the exact class of defect Pincite catches (37 CFR 1.84(p)(5)).
const FLAGGED = [
  { n: "108", cx: 300, cy: 405 },
  { n: "203", cx: 118, cy: 420 },
  { n: "216", cx: 150, cy: 214 },
  { n: "224", cx: 452, cy: 392 },
];

const G = "var(--color-muted-foreground)";
const R = "var(--color-violation)";

export function PatentFigure({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 540 470" className={cn("w-full", className)} role="img" aria-label="Patent figure with reference numerals flagged in red">
      <text x="10" y="26" fill={G} fontSize={15} fontFamily="var(--font-geist-mono)">FIG. 2</text>

      {/* housing (cross section, double wall + hatching) */}
      <rect x="150" y="70" width="240" height="300" rx="16" fill="none" stroke={G} strokeWidth={2.5} />
      <rect x="168" y="88" width="204" height="264" rx="10" fill="none" stroke={G} strokeWidth={1.6} />
      {Array.from({ length: 7 }).map((_, i) => (
        <line key={"hl" + i} x1={150} y1={90 + i * 40} x2={168} y2={78 + i * 40} stroke={G} strokeWidth={1} />
      ))}
      {Array.from({ length: 7 }).map((_, i) => (
        <line key={"hr" + i} x1={372} y1={90 + i * 40} x2={390} y2={78 + i * 40} stroke={G} strokeWidth={1} />
      ))}

      {/* outlet nozzle */}
      <path d="M250 70 L250 34 L290 34 L290 70 Z" fill="none" stroke={G} strokeWidth={2} />
      <line x1="270" y1="34" x2="270" y2="16" stroke={G} strokeWidth={2} />
      {/* piston + seals */}
      <rect x="200" y="170" width="140" height="46" rx="4" fill="none" stroke={G} strokeWidth={2} />
      <rect x="196" y="176" width="8" height="34" fill={G} opacity={0.5} />
      <rect x="336" y="176" width="8" height="34" fill={G} opacity={0.5} />
      {/* spring coil */}
      <path
        d="M210 216 L270 236 L210 256 L270 276 L210 296 L270 316 L330 316 L270 296 L330 276 L270 256 L330 236 L270 216"
        fill="none"
        stroke={G}
        strokeWidth={1.8}
      />
      {/* ball valve */}
      <circle cx="270" cy="340" r="14" fill="none" stroke={G} strokeWidth={2} />
      {/* inlet tube + mount */}
      <path d="M240 370 L240 410 L300 410 L300 370" fill="none" stroke={G} strokeWidth={2} />
      <path d="M390 350 L430 350 L430 380 L410 380" fill="none" stroke={G} strokeWidth={2} />

      {/* leaders + numerals */}
      <Leader x1={150} y1={110} x2={120} y2={92} n="100" />
      <Leader x1={270} y1={20} x2={300} y2={20} n="110" />
      <Leader x1={372} y1={130} x2={452} y2={120} n="102" />
      <Leader x1={340} y1={193} x2={462} y2={200} n="104" />
      <Leader x1={330} y1={266} x2={462} y2={300} n="106" />
      <Leader x1={278} y1={352} x2={300} y2={405} n="108" flag />
      <Leader x1={240} y1={410} x2={118} y2={420} n="203" flag />
      <Leader x1={196} y1={193} x2={150} y2={214} n="216" flag />
      <Leader x1={430} y1={365} x2={452} y2={392} n="224" flag />

      {FLAGGED.map((f) => (
        <circle key={f.n} cx={f.cx} cy={f.cy} r={16} fill="none" stroke={R} strokeWidth={3} />
      ))}
    </svg>
  );
}

function Leader({ x1, y1, x2, y2, n, flag }: { x1: number; y1: number; x2: number; y2: number; n: string; flag?: boolean }) {
  return (
    <>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={G} strokeWidth={1.2} />
      <text
        x={x2}
        y={y2}
        dx={x2 < 270 ? -14 : 6}
        dy={5}
        fill={flag ? R : G}
        fontSize={17}
        fontFamily="var(--font-geist-mono)"
        fontWeight={flag ? 700 : 400}
      >
        {n}
      </text>
    </>
  );
}
