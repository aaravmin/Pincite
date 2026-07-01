"use client";

// Prop-only annotated draft surface. This is the real product annotation pattern
// (text.slice + <mark>, as used in review-client/evidence-pane) extracted so it
// renders purely from props: plain text + character-offset spans + a signal.
//
// No clock, no fetching. Reveal is driven by `progress` (0..1). Hover is emitted
// via `onActivateFlag`; the parent owns the active state (web: mouse, Remotion:
// frame). That keeps it identical on the site, in the app, and in the video.

import { cn } from "@/lib/utils";
import { SIGNAL, clamp01, type VisualSpan } from "./types";

type Segment =
  | { kind: "plain"; text: string; key: string }
  | { kind: "mark"; text: string; span: VisualSpan; key: string };

function segment(text: string, spans: VisualSpan[]): Segment[] {
  const ordered = [...spans]
    .filter((s) => s.end > s.start && s.start >= 0 && s.end <= text.length)
    .sort((a, b) => a.start - b.start);
  const out: Segment[] = [];
  let cursor = 0;
  ordered.forEach((span, i) => {
    if (span.start < cursor) return; // skip overlaps defensively
    if (span.start > cursor) {
      out.push({ kind: "plain", text: text.slice(cursor, span.start), key: `p${i}` });
    }
    out.push({ kind: "mark", text: text.slice(span.start, span.end), span, key: `m${i}` });
    cursor = span.end;
  });
  if (cursor < text.length) {
    out.push({ kind: "plain", text: text.slice(cursor), key: "p-end" });
  }
  return out;
}

export type AnnotatedEditorProps = {
  /** the plain draft text (newlines preserved) */
  text: string;
  spans: VisualSpan[];
  /** id of the flag currently opened (ring emphasis + pulse) */
  activeFlagId?: string | null;
  /** 0..1 reveal of the marks and flag markers */
  progress?: number;
  /** small caption above the editor, e.g. "Claims" */
  label?: string;
  /** filename-style chrome caption, e.g. "US 2012 0024859 A1  .  Claims" */
  caption?: string;
  onActivateFlag?: (id: string | null) => void;
  className?: string;
};

export function AnnotatedEditor({
  text,
  spans,
  activeFlagId = null,
  progress = 1,
  label,
  caption,
  onActivateFlag,
  className,
}: AnnotatedEditorProps) {
  const p = clamp01(progress);
  const segments = segment(text, spans);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      {/* editor chrome */}
      <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-muted-foreground/30" />
          <span className="size-2.5 rounded-full bg-muted-foreground/30" />
          <span className="size-2.5 rounded-full bg-muted-foreground/30" />
        </span>
        {caption ? (
          <span className="ml-1 truncate font-mono text-xs text-muted-foreground">{caption}</span>
        ) : null}
      </div>

      <div className="p-4 sm:p-5">
        {label ? (
          <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
        ) : null}
        <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-foreground/90">
          {segments.map((seg) => {
            if (seg.kind === "plain") return <span key={seg.key}>{seg.text}</span>;
            const s = SIGNAL[seg.span.signal];
            const isFlag = Boolean(seg.span.flagId);
            const isActive = isFlag && seg.span.flagId === activeFlagId;
            // The draft text is content, never gated by the reveal - only the
            // flag badge emphasis animates in (with a visible floor).
            const badge = 0.55 + 0.45 * clamp01((p - 0.15) * 1.6);
            return (
              <mark
                key={seg.key}
                data-flag={seg.span.flagId ?? undefined}
                onMouseEnter={
                  isFlag && onActivateFlag ? () => onActivateFlag(seg.span.flagId!) : undefined
                }
                onMouseLeave={isFlag && onActivateFlag ? () => onActivateFlag(null) : undefined}
                onFocus={
                  isFlag && onActivateFlag ? () => onActivateFlag(seg.span.flagId!) : undefined
                }
                onBlur={isFlag && onActivateFlag ? () => onActivateFlag(null) : undefined}
                tabIndex={isFlag ? 0 : undefined}
                className={cn(
                  "rounded-[3px] px-0.5 outline-none transition-shadow",
                  s.bg,
                  s.text,
                  "underline decoration-2 underline-offset-4",
                  seg.span.signal === "red" && "decoration-violation",
                  seg.span.signal === "yellow" && "decoration-attention",
                  seg.span.signal === "green" && "decoration-pass",
                  isFlag && "cursor-pointer",
                  isActive && cn("ring-2 ring-offset-1 ring-offset-card", s.ring),
                )}
              >
                {seg.text}
                {isFlag ? (
                  <sup
                    aria-hidden
                    style={{
                      opacity: badge,
                      transform: `scale(${0.8 + 0.2 * clamp01((p - 0.15) * 1.6)})`,
                    }}
                    className={cn(
                      "ml-0.5 inline-flex size-4 -translate-y-1 items-center justify-center rounded-full align-super text-[9px] font-bold",
                      s.solid,
                      s.on,
                      isActive && "animate-none",
                    )}
                  >
                    !
                  </sup>
                ) : null}
              </mark>
            );
          })}
        </pre>
      </div>
    </div>
  );
}
