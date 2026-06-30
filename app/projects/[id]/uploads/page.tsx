import Link from "next/link";
import { HeaderActions } from "@/components/projects/header-actions";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProject, getSectionContent } from "@/lib/projects/queries";
import { getAttachments } from "@/lib/filing/queries";
import { UploadsPanel } from "@/components/uploads/uploads-panel";

export default async function UploadsPage({
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
  const [attachments, sections] = await Promise.all([
    getAttachments(id),
    getSectionContent(id),
  ]);
  // The draft text the live drawing check measures numerals against (matches analyzeDrawing).
  const specText = `${sections.detailed_description ?? ""} ${sections.drawings_meta ?? ""} ${sections.summary ?? ""}`;

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
            Drawings &amp; documents
          </span>
        </div>
        <HeaderActions projectId={id} />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <p className="text-sm text-muted-foreground">
          Upload your figures and any supporting documents. The 2D drawings flow into the
          filing package; a 3D model is a visualization aid and is not filed. Files are
          stored encrypted in the US and scoped to you. Only the optional drawing check
          sends a figure to a vision model.
        </p>
        <div className="mt-6">
          <UploadsPanel projectId={id} initial={attachments} specText={specText} />
        </div>
      </main>
    </div>
  );
}
