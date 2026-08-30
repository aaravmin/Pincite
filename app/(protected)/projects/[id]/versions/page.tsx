import { HeaderActions } from "@/features/projects/ui/header-actions";
import { notFound } from "next/navigation";
import { requireViewer } from "@/shared/auth/require-viewer";
import { getVersionsPage } from "@/features/projects/application/get-versions-page";
import { VersionActions } from "@/features/projects/ui/version-actions";
import { fmtDateTime } from "@/shared/format";

export default async function VersionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { profile } = await requireViewer();
  const unit = profile.role === "attorney" ? "matter" : "application";

  const model = await getVersionsPage(id);
  if (!model) notFound();
  const versions = model.versions;

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Version history
          </span>
        </div>
        <HeaderActions projectId={id} />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <p className="text-sm text-muted-foreground">
          Every save is a permanent snapshot. Continue this {unit} from any earlier
          save - it opens into your draft and never deletes later saves.
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
