import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardProjects } from "@/components/dashboard/dashboard-projects";
import { getDashboardProjects } from "@/lib/projects/queries";
import { isAdminEmail } from "@/lib/admin";

// Always render per request for the signed-in user; never serve another account's cache.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
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
  if (!profile?.role) redirect("/role");
  const isAttorney = profile.role === "attorney";
  const isAdmin = isAdminEmail(user.email);

  const projects = await getDashboardProjects();

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar email={user.email ?? ""} active="dashboard" />
      <main className="min-w-0 flex-1">
        <div
          className={
            "mx-auto w-full px-6 py-10 " +
            (isAttorney ? "max-w-6xl" : "max-w-4xl")
          }
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {isAttorney ? "Portfolio" : "Your patents"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isAttorney
                  ? "Matters across your clients."
                  : "Each project is one patent."}
              </p>
            </div>
            <NewProjectDialog isAttorney={isAttorney} />
          </div>
          <DashboardProjects
            projects={projects}
            isAttorney={isAttorney}
            isAdmin={isAdmin}
          />
        </div>
      </main>
    </div>
  );
}
