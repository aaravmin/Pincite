import { cn } from "@/lib/utils";

// A stylized patent first page (thumbnail) for the export feature - shows what the
// filing-ready output looks like without a wall of text. Body copy is represented
// as bars; the header, headings, and INID codes are real, so it reads as a genuine
// USPTO front page (bibliographic column on the left, abstract and figure on the
// right).
function Bar({ w = "100%" }: { w?: string }) {
  return <div className="h-2 rounded-full bg-muted" style={{ width: w }} />;
}

// A bibliographic line: an INID code, its label, and a filled value bar.
function BibRow({ code, label, w = "60%" }: { code: string; label: string; w?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="shrink-0 text-[9px] font-semibold text-muted-foreground">{code}</span>
      <span className="shrink-0 text-[9px] text-muted-foreground">{label}</span>
      <div className="h-1.5 rounded-full bg-muted" style={{ width: w }} />
    </div>
  );
}

export function MiniPatentPage({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-background p-5 shadow-sm", className)}>
      {/* header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground">(19) United States</p>
          <p className="text-[13px] font-semibold leading-tight text-foreground">
            United States Patent Application Publication
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">US 2012 / 0024859 A1</p>
        </div>
        <div className="flex gap-[2px]" aria-hidden>
          {Array.from({ length: 16 }).map((_, i) => (
            <span key={i} className="h-6 bg-foreground" style={{ width: i % 3 === 0 ? 2.5 : 1.5 }} />
          ))}
        </div>
      </div>
      <div className="mt-3 border-t-2 border-foreground" />

      {/* two columns: bibliographic data on the left, abstract and figure on the right */}
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div className="space-y-2.5">
          <p className="text-[11px] font-semibold text-foreground">(54) MOLDED FIBER CONTAINER</p>
          <Bar w="72%" />
          <BibRow code="(71)" label="Applicant" w="66%" />
          <BibRow code="(72)" label="Inventors" w="72%" />
          <BibRow code="(21)" label="Appl. No." w="44%" />
          <BibRow code="(22)" label="Filed" w="50%" />
          <BibRow code="(51)" label="Int. Cl." w="40%" />
          <BibRow code="(52)" label="U.S. Cl." w="56%" />
          <BibRow code="(58)" label="Field" w="48%" />
          <p className="pt-0.5 text-[10px] font-semibold text-foreground">(56) References Cited</p>
          <Bar w="88%" />
          <Bar w="70%" />
        </div>
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-foreground">(57) ABSTRACT</p>
          <Bar />
          <Bar w="94%" />
          <Bar w="88%" />
          <Bar w="70%" />
          <div className="pt-1 text-[10px] text-muted-foreground">FIG. 1</div>
          <svg viewBox="0 0 160 104" className="w-full">
            <rect x="20" y="34" width="120" height="52" rx="6" fill="none" stroke="var(--color-muted-foreground)" strokeWidth={1.4} />
            {Array.from({ length: 5 }).map((_, i) => (
              <line key={i} x1={34 + i * 22} y1={44} x2={34 + i * 22} y2={76} stroke="var(--color-muted-foreground)" strokeWidth={1} />
            ))}
            <path d="M20 34 L44 18 L164 18 L140 34" fill="none" stroke="var(--color-muted-foreground)" strokeWidth={1.4} />
          </svg>
          <Bar w="86%" />
          <Bar w="64%" />
        </div>
      </div>
    </div>
  );
}
