import { serif } from "../fonts";

// A representative filing-ready patent application first page (USPTO 1.77 style),
// so the export beat shows what the output actually looks like. Public Apple
// example bibliographic data; abstract paraphrased for the demo page.
export function PatentDoc({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      style={{
        width: 660,
        background: "#ffffff",
        border: "1px solid #d4d4d8",
        boxShadow: "0 24px 60px rgba(0,0,0,0.16)",
        fontFamily: serif.fontFamily,
        color: "#111",
        padding: "34px 40px",
        ...style,
      }}
    >
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 13 }}>
          <div>(19) United States</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
            United States Patent Application Publication
          </div>
          <div style={{ marginTop: 2 }}>(10) Pub. No.: US 2012 / 0024859 A1</div>
        </div>
        <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10, letterSpacing: 1, color: "#333", textAlign: "right" }}>
          <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
            {Array.from({ length: 26 }).map((_, i) => (
              <span key={i} style={{ width: i % 3 === 0 ? 3 : 1.5, height: 30, background: "#111", display: "inline-block" }} />
            ))}
          </div>
          <div style={{ marginTop: 4 }}>US 20120024859A1</div>
        </div>
      </div>

      <div style={{ borderTop: "2px solid #111", margin: "14px 0" }} />

      {/* two columns */}
      <div style={{ display: "flex", gap: 26, fontSize: 13, lineHeight: 1.5 }}>
        <div style={{ flex: 1 }}>
          <Field n="54" label="MOLDED FIBER CONTAINER FOR HOLDING A FOOD ITEM" bold />
          <Field n="71" label="Applicant: Apple Inc., Cupertino, CA (US)" />
          <Field n="72" label="Inventors: Francesco Longoni; Mark E. Doutt" />
          <Field n="21" label="Appl. No.: 12 / 843,439" />
          <Field n="22" label="Filed: Jul. 26, 2010" />
          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 700 }}>(57) ABSTRACT</div>
            <p style={{ marginTop: 4, textAlign: "justify" }}>
              A container is formed from a single piece of molded fiber. A base has a plurality of
              ridges that lift a food item, and a lid has openings and a moisture channeling feature
              that carry moisture away so the food stays crisp. The base and lid nest to save space.
            </p>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <svg viewBox="0 0 220 200" style={{ width: "100%" }}>
            <text x="8" y="16" fontSize="11" fontFamily="monospace">FIG. 1</text>
            <rect x="30" y="60" width="160" height="90" rx="10" fill="none" stroke="#111" strokeWidth={1.5} />
            {Array.from({ length: 6 }).map((_, i) => (
              <line key={i} x1={45 + i * 24} y1={70} x2={45 + i * 24} y2={140} stroke="#111" strokeWidth={1} />
            ))}
            <path d="M30 60 L60 40 L220 40 L190 60" fill="none" stroke="#111" strokeWidth={1.5} />
            <line x1="110" y1="40" x2="110" y2="20" stroke="#111" strokeWidth={1} />
            <text x="116" y="24" fontSize="10" fontFamily="monospace">10</text>
            <text x="196" y="120" fontSize="10" fontFamily="monospace">12</text>
          </svg>
          <p style={{ marginTop: 8, textAlign: "justify", fontSize: 12 }}>
            Ridges in the base form a gap beneath the food item, and vents in the lid channel the
            moisture out of the container.
          </p>
        </div>
      </div>

      <div style={{ borderTop: "1px solid #d4d4d8", marginTop: 14, paddingTop: 8, fontSize: 12, color: "#333" }}>
        What is claimed is: 1. A molded fiber container suitable for containing a food item,
        comprising a base and a lid ...
      </div>
    </div>
  );
}

function Field({ n, label, bold }: { n: string; label: string; bold?: boolean }) {
  return (
    <div style={{ marginTop: 6, fontWeight: bold ? 700 : 400 }}>
      <span style={{ color: "#333" }}>({n}) </span>
      {label}
    </div>
  );
}
