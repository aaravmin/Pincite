import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/projects/queries";
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
  const attachments = await getAttachments(id);

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
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <p className="text-sm text-muted-foreground">
          Upload your figures and any supporting documents. Drawings flow into the filing
          package as the drawings PDF. Files are stored encrypted in the US, scoped to you;
          they are never sent to a model or embedding vendor.
        </p>
        <div className="mt-6">
          <UploadsPanel projectId={id} initial={attachments} />
        </div>
      </main>
    </div>
  );
}
