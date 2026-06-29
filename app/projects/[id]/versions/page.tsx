import Link from "next/link";
import { HeaderActions } from "@/components/projects/header-actions";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProject, listVersions } from "@/lib/projects/queries";
import { VersionActions } from "@/components/projects/version-actions";
import { fmtDateTime } from "@/lib/format";

export default async function VersionsPage({
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

  const project = await getProject(id);
  if (!project) notFound();
  const versions = await listVersions(id);

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← {project.name}
          </Link>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Version history
          </span>
        </div>
        <HeaderActions projectId={id} />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <p className="text-sm text-muted-foreground">
          Every save is an immutable snapshot. Restoring or branching opens a
          snapshot into a new save and never deletes later ones.
        </p>

        {versions.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            No versions saved yet. Use “Save version” in the workspace.
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-border rounded-lg border border-border">
            {versions.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {v.label || "Untitled save"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDateTime(v.created_at)}
                    {v.parent_version_id ? " · reopened from an earlier save" : ""}
                  </p>
                </div>
                <VersionActions projectId={id} versionId={v.id} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
