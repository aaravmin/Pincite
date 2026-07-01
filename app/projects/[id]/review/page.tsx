import Link from "next/link";
import { HeaderActions } from "@/components/projects/header-actions";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProject, getSectionContent } from "@/lib/projects/queries";
import { getInventors, getAttachments } from "@/lib/filing/queries";
import { getDisclosure } from "@/lib/disclosure/queries";
import { runFilingChecks, resolveFilingPins } from "@/lib/validators/filing";
import { runCrossRefChecks } from "@/lib/validators/crossref";
import { getReview } from "@/lib/validators/results";
import { ReviewClient } from "@/components/validators/review-client";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("consented_at, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.consented_at) redirect("/consent");

  const project = await getProject(id);
  if (!project) notFound();
  const { sections, findings } = await getReview(id);

  const [inventors, attachments, sectionContent] = await Promise.all([
    getInventors(id),
    getAttachments(id),
    getSectionContent(id),
  ]);
  const filing = await resolveFilingPins(
    runFilingChecks({
      project,
      inventors,
      hasSignedDeclaration: attachments.some((a) => a.kind === "declaration"),
      role: profile.role ?? null,
      title: sectionContent["title"] ?? "",
    }),
  );
  const filingFix = filing.filter((f) => f.severity === "violation").length;
  const filingCheck = filing.filter((f) => f.severity === "attention").length;

  const disclosure = await getDisclosure(id);
  const consistency = runCrossRefChecks(disclosure, sectionContent);

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Review
          </span>
        </div>
        <HeaderActions projectId={id} />
      </header>
      {filing.length > 0 && (
        <Link
          href={`/projects/${id}/sign`}
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
          href={`/projects/${id}/disclosure`}
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
        <ReviewClient projectId={id} sections={sections} findings={findings} />
      </div>
    </div>
  );
}
