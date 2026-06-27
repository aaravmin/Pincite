/**
 * The evidence pane (roadmap §2.2): the primary source on a reading surface, with the
 * responsive portion highlighted yellow in place and the rest visible for context.
 * Reused by the Ask flow now and by findings / rules in later phases.
 */
import type { MpepSection } from "@/lib/mpep/load";

export function EvidencePane({
  section,
  span,
}: {
  section: MpepSection;
  span: { start: number; end: number } | null;
}) {
  const text = section.full_text;
  const has =
    !!span && span.start >= 0 && span.end > span.start && span.end <= text.length;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-5 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">
            MPEP {section.section_number}
            {section.title ? ` — ${section.title}` : ""}
          </h2>
          <a
            href={section.source_url}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            USPTO source
          </a>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {section.edition}
          {section.revision_tag ? ` · ${section.revision_tag}` : ""}
        </p>
      </div>

      <div className="flex-1 overflow-auto px-5 py-4">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
          {has ? (
            <>
              {text.slice(0, span!.start)}
              <mark
                id="evidence-highlight"
                aria-label="responsive passage"
                className="border-b-2 border-attention bg-attention-bg text-attention-foreground"
              >
                {text.slice(span!.start, span!.end)}
              </mark>
              {text.slice(span!.end)}
            </>
          ) : (
            text
          )}
        </pre>
      </div>
    </div>
  );
}
