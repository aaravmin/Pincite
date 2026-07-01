import type { FilingFinding } from "@/lib/validators/filing";

// Color discipline: violation = solid red dot, attention = outline yellow dot, each with a
// text label ("Issue"/"Check") so color is never the only signal.
function dotClass(sev: FilingFinding["severity"]): string {
  if (sev === "violation") return "bg-violation";
  if (sev === "attention") return "border-2 border-attention bg-transparent";
  return "bg-pass";
}
function labelText(sev: FilingFinding["severity"]): string {
  if (sev === "violation") return "Issue";
  if (sev === "attention") return "Check";
  return "OK";
}
function labelClass(sev: FilingFinding["severity"]): string {
  if (sev === "violation") return "text-violation";
  if (sev === "attention") return "text-attention-foreground";
  return "text-pass";
}

export function FilingReadiness({
  findings,
  emptyMessage = "No filing issues.",
}: {
  findings: FilingFinding[];
  emptyMessage?: string;
}) {
  if (findings.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border p-4 text-sm text-muted-foreground">
        <span className="inline-block size-2.5 rounded-full bg-pass" aria-hidden />
        {emptyMessage}
      </div>
    );
  }
  const toFix = findings.filter((f) => f.severity === "violation").length;
  const toCheck = findings.filter((f) => f.severity === "attention").length;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {toFix} to fix, {toCheck} to check before filing.
      </p>
      <ul className="space-y-2">
        {findings.map((f, i) => (
          <li key={i} className="rounded-lg border border-border p-3">
            <div className="flex items-start gap-2.5">
              <span
                className={`mt-1 size-2.5 shrink-0 rounded-full ${dotClass(f.severity)}`}
                aria-hidden
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs font-medium ${labelClass(f.severity)}`}>
                    {labelText(f.severity)}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {f.title}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {f.explanation}
                </p>
                {(f.cfr_ref || f.mpep_section) && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[f.cfr_ref, f.mpep_section ? `MPEP ${f.mpep_section}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
