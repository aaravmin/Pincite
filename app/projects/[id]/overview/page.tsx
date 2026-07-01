import { notFound, redirect } from "next/navigation";
import { HeaderActions } from "@/components/projects/header-actions";
import { OverviewClient } from "@/components/overview/overview-client";
import { createClient } from "@/lib/supabase/server";
import { getReadiness } from "@/lib/readiness";
import type { UserRole } from "@/lib/profile";

export default async function OverviewPage({
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

  const r = await getReadiness(id, (profile.role as UserRole | null) ?? null);
  if (!r) notFound();

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="truncate text-lg font-semibold tracking-tight text-foreground">
            {r.project.name}
          </span>
          <span className="hidden text-xs text-muted-foreground sm:inline">Overview</span>
        </div>
        <HeaderActions projectId={id} />
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Where this stands
          </p>
          <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-foreground">
            {r.stage.label}
          </h1>
        </div>
        <OverviewClient readiness={r} />
      </main>
    </div>
  );
}
