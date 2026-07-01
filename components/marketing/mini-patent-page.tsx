import { cn } from "@/lib/utils";

// A small stylized patent first page (thumbnail) for the export feature - shows
// what the filing-ready output looks like without a wall of text. Body copy is
// represented as bars; the header and headings are real.
function Bar({ w = "100%" }: { w?: string }) {
  return <div className="h-2 rounded-full bg-muted" style={{ width: w }} />;
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

      {/* two columns */}
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-foreground">(54) MOLDED FIBER CONTAINER</p>
          <Bar w="70%" />
          <Bar w="55%" />
          <p className="pt-1 text-[10px] font-semibold text-foreground">(57) ABSTRACT</p>
          <Bar />
          <Bar w="92%" />
          <Bar w="80%" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">FIG. 1</span>
          </div>
          <svg viewBox="0 0 160 90" className="w-full">
            <rect x="20" y="30" width="120" height="45" rx="6" fill="none" stroke="var(--color-muted-foreground)" strokeWidth={1.4} />
            {Array.from({ length: 5 }).map((_, i) => (
              <line key={i} x1={34 + i * 22} y1={38} x2={34 + i * 22} y2={68} stroke="var(--color-muted-foreground)" strokeWidth={1} />
            ))}
            <path d="M20 30 L44 16 L164 16 L140 30" fill="none" stroke="var(--color-muted-foreground)" strokeWidth={1.4} />
          </svg>
          <Bar w="88%" />
          <Bar w="70%" />
        </div>
      </div>
    </div>
  );
}
