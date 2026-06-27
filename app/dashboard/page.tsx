import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { getDashboardProjects } from "@/lib/projects/queries";
import {
  PATENT_TYPE_LABELS,
  PROJECT_STATUS_LABELS,
} from "@/lib/projects/sections";
import { fmtDate } from "@/lib/format";

export default async function DashboardPage() {
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

  const projects = await getDashboardProjects();

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <span className="text-lg font-semibold tracking-tight text-foreground">
          Pincite
        </span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Projects
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Each project is one in-progress patent, saved as versioned,
              audited sessions.
            </p>
          </div>
          <NewProjectDialog />
        </div>

        {projects.length === 0 ? (
          <div className="mt-10 flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
            <p className="text-sm font-medium text-foreground">No projects yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Create your first project to start the structured intake. Your
              workspace is ready and your session is secure.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="block rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <Card className="h-full transition-colors hover:bg-accent/40">
                  <CardHeader>
                    <CardTitle className="truncate">{p.name}</CardTitle>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary">
                        {PATENT_TYPE_LABELS[p.patent_type]}
                      </Badge>
                      <Badge variant="outline">
                        {PROJECT_STATUS_LABELS[p.declared_status]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <dl className="grid grid-cols-2 gap-y-1">
                      <dt>Completeness</dt>
                      <dd className="text-right text-foreground">
                        {p.completeness}%
                      </dd>
                      <dt>Open findings</dt>
                      <dd className="text-right text-foreground">0</dd>
                      <dt>Versions</dt>
                      <dd className="text-right text-foreground">
                        {p.versionCount}
                      </dd>
                      <dt>Last edited</dt>
                      <dd className="text-right text-foreground">
                        {fmtDate(p.updated_at)}
                      </dd>
                    </dl>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
