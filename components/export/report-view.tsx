/**
 * Print-friendly review report (roadmap §9). Severity is shown with a filled vs outline
 * marker plus a text label, so the color coding survives a grayscale print.
 */
import type { Report } from "@/lib/export/report";

const pin = (cfr: string | null, mpep: string | null) =>
  [cfr, mpep ? `MPEP ${mpep}` : null].filter(Boolean).join(" · ");

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="border-b border-border pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

export function ReportView({ report: r }: { report: Report }) {
  return (
    <div
      className="mx-auto max-w-3xl px-8 py-8 text-sm text-foreground"
      data-testid="report"
    >
      <h1 className="text-2xl font-semibold tracking-tight">{r.project.name}</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Type {r.project.patent_type} · Stage {r.stage} · Generated{" "}
        {r.generatedAt.slice(0, 16).replace("T", " ")} UTC
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        A research aid, not legal advice. Verify every item against the cited source.
      </p>

      <Section title="Draft">
        {r.sections.length === 0 ? (
          <p className="text-muted-foreground">No sections filled in.</p>
        ) : (
          r.sections.map((s) => (
            <div key={s.key} className="mt-3">
              <h3 className="font-medium">{s.label}</h3>
              <pre className="mt-1 whitespace-pre-wrap font-sans text-sm">
                {s.content.trim()}
              </pre>
            </div>
          ))
        )}
      </Section>

      <Section title="Findings">
        {r.findings.length === 0 ? (
          <p className="text-muted-foreground">No findings.</p>
        ) : (
          r.findings.map((f) => (
            <div key={f.id} className="mt-2">
              <p>
                <span
                  className={
                    f.severity === "violation"
                      ? "font-medium text-violation"
                      : "font-medium text-attention-foreground"
                  }
                >
                  {f.severity === "violation" ? "● Violation" : "○ Attention"}
                </span>{" "}
                · {f.actionable ? "Fixable" : "Informational"} - {f.title}
              </p>
              <p className="text-muted-foreground">{f.explanation}</p>
              <p className="text-xs text-muted-foreground">
                {pin(f.cfr_ref, f.mpep_section)}
              </p>
            </div>
          ))
        )}
      </Section>

      <Section title="Rules that apply now">
        {r.appliesNow.map((ru, i) => (
          <p key={i} className="mt-1">
            <span className="text-pass">✓</span> {ru.note}{" "}
            <span className="text-xs text-muted-foreground">
              ({pin(ru.cfr_ref, ru.mpep_section)})
            </span>
          </p>
        ))}
      </Section>

      {r.conditional.some((ru) => ru.triggered) && (
        <Section title="Conditions now met (these rules now apply)">
          {r.conditional
            .filter((ru) => ru.triggered)
            .map((ru, i) => (
              <p key={i} className="mt-1">
                <span className="text-attention-foreground">●</span>{" "}
                <em>{ru.met}.</em> {ru.note}{" "}
                <span className="text-xs text-muted-foreground">
                  ({pin(ru.cfr_ref, ru.mpep_section)})
                </span>
              </p>
            ))}
        </Section>
      )}

      <Section title="Rules that may apply next (not yet)">
        {r.conditional
          .filter((ru) => !ru.triggered)
          .map((ru, i) => (
            <p key={i} className="mt-1">
              <span className="text-attention-foreground">○</span>{" "}
              <em>{ru.trigger}.</em> {ru.note}{" "}
              <span className="text-xs text-muted-foreground">
                ({pin(ru.cfr_ref, ru.mpep_section)})
              </span>
            </p>
          ))}
      </Section>

      <Section title="Similar patents">
        {r.priorArt.length === 0 ? (
          <p className="text-muted-foreground">No prior-art search run.</p>
        ) : (
          r.priorArt.map((m) => (
            <div key={m.id} className="mt-2">
              <p className="font-medium">
                {m.patent_number}
                {m.title ? ` - ${m.title}` : ""}{" "}
                <span className="text-xs text-muted-foreground">
                  score {m.overall_score?.toFixed(2) ?? "-"}
                </span>
              </p>
              {m.spans.map((sp, i) => (
                <p key={i} className="text-xs text-muted-foreground">
                  {sp.overlap_type === "claim_limitation"
                    ? "● covers a whole requirement of your claim"
                    : "○ shares wording"}
                  : {sp.patent_span_text.slice(0, 160)}
                </p>
              ))}
            </div>
          ))
        )}
      </Section>

      <p className="mt-6 text-xs text-muted-foreground">
        Research signal only - not a validity or freedom-to-operate opinion.
      </p>
    </div>
  );
}
