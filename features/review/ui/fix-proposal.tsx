"use client";

/**
 * A GitHub-style before/after for one proposed auto-fix: the removed text, the added text,
 * and accept/reject. Color carries a label and a +/- marker too, never color alone.
 */
import { Button } from "@/components/ui/button";

export type ProposedFix = { before: string; after: string; note: string };

export function FixProposal({
  proposal,
  applying,
  onAccept,
  onReject,
}: {
  proposal: ProposedFix;
  applying: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div className="space-y-2 rounded-md border border-border p-2" data-testid="fix-diff">
      {proposal.note && (
        <p className="text-xs text-muted-foreground">{proposal.note}</p>
      )}
      <div className="overflow-hidden rounded border border-border font-mono text-xs">
        <div className="flex gap-2 border-b border-border bg-violation-bg px-2 py-1">
          <span className="select-none font-sans font-medium text-violation">- Before</span>
          <span className="min-w-0 whitespace-pre-wrap break-words text-foreground">
            {proposal.before}
          </span>
        </div>
        <div className="flex gap-2 bg-pass/10 px-2 py-1">
          <span className="select-none font-sans font-medium text-pass">+ After</span>
          <span className="min-w-0 whitespace-pre-wrap break-words text-foreground">
            {proposal.after}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onAccept}
          disabled={applying}
          data-testid="accept-fix"
        >
          {applying ? "Applying…" : "Accept edit"}
        </Button>
        <Button size="sm" variant="outline" onClick={onReject} disabled={applying}>
          Reject
        </Button>
      </div>
    </div>
  );
}
