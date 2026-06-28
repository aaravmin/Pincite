import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProject, getSectionContent } from "@/lib/projects/queries";
import { getDisclosure } from "@/lib/disclosure/queries";
import { runCrossRefChecks, resolveCrossRefPins } from "@/lib/validators/crossref";
import { DisclosureForm } from "@/components/disclosure/disclosure-form";
import { FilingReadiness } from "@/components/filing/filing-readiness";

export default async function DisclosurePage({
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
    .select("consented_at")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.consented_at) redirect("/consent");

  const project = await getProject(id);
  if (!project) notFound();
  const [disclosure, sections] = await Promise.all([
    getDisclosure(id),
    getSectionContent(id),
  ]);
  const consistency = await resolveCrossRefPins(
    runCrossRefChecks(disclosure, sections),
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← {project.name}
          </Link>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Invention intake
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-6 py-8">
        <p className="text-sm text-muted-foreground">
          Describe your invention in plain language, in as much technical detail as you can.
          Pincite cross-references this against your specification and claims, and it feeds
          your duty to disclose.
        </p>
        <DisclosureForm projectId={id} initial={disclosure} />
        <section>
          <h2 className="text-sm font-semibold text-foreground">
            Consistency with your draft
          </h2>
          <div className="mt-3">
            <FilingReadiness
              findings={consistency}
              emptyMessage="Your disclosure lines up with the draft so far."
            />
          </div>
        </section>
      </main>
    </div>
  );
}
