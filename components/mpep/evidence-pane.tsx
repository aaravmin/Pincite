"use client";

/**
 * The evidence pane (roadmap §2.2): the primary source on a reading surface, with the
 * responsive portion highlighted in place and the rest visible for context. When a passage
 * is highlighted the pane scrolls to it, so opening a rule lands you on the relevant part
 * rather than the top of a long section.
 */
import { useEffect, useRef } from "react";
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!has) return;
    const c = scrollRef.current;
    const h = c?.querySelector<HTMLElement>("#evidence-highlight");
    if (!c || !h) return;
    const top =
      h.getBoundingClientRect().top - c.getBoundingClientRect().top + c.scrollTop;
    c.scrollTop = Math.max(0, top - c.clientHeight / 2);
  }, [section.section_number, span?.start, span?.end, has]);

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

      <div ref={scrollRef} className="flex-1 overflow-auto px-5 py-4">
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
