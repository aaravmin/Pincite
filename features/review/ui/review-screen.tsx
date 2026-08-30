/**
 * The Review screen's composition: the header, the two banners that summarize the
 * document-level check families (filing readiness, disclosure consistency) with a link to the
 * step that resolves them, and the interactive findings surface.
 *
 * A banner appears only when its check family produced something, so a clean matter shows a
 * clean screen. Color discipline: the "to fix" count is red only when there is something to
 * fix; everything else is neutral or the attention token.
 */
import Link from "next/link";
import { HeaderActions } from "@/components/projects/header-actions";
import type { ReviewPageModel } from "@/features/review/application/get-review-page";
import { ReviewClient } from "@/features/review/ui/review-client";

export function ReviewScreen({
  projectId,
  model,
}: {
  projectId: string;
  model: ReviewPageModel;
}) {
  const { filing, filingFix, filingCheck, consistency } = model;

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Review
          </span>
        </div>
        <HeaderActions projectId={projectId} />
      </header>
      {filing.length > 0 && (
        <Link
          href={`/projects/${projectId}/sign`}
          className="block border-b border-border bg-secondary/40 px-6 py-2 text-sm hover:bg-secondary/60"
        >
          <span className="font-medium text-foreground">Filing readiness:</span>{" "}
          <span
            className={
              filingFix > 0 ? "text-violation" : "text-muted-foreground"
            }
          >
            {filingFix} to fix
          </span>
          , {filingCheck} to check →{" "}
          <span className="underline">Sign documents</span>
        </Link>
      )}
      {consistency.length > 0 && (
        <Link
          href={`/projects/${projectId}/disclosure`}
          className="block border-b border-border bg-secondary/40 px-6 py-2 text-sm hover:bg-secondary/60"
        >
          <span className="font-medium text-foreground">Consistency:</span>{" "}
          <span className="text-attention-foreground">
            {consistency.length} to reconcile
          </span>{" "}
          →{" "}
          <span className="underline">Invention intake</span>
        </Link>
      )}
      <div className="min-h-0 flex-1">
        <ReviewClient
          projectId={projectId}
          sections={model.sections}
          findings={model.findings}
        />
      </div>
    </div>
  );
}
