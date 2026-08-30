import { redirect } from "next/navigation";
import { requireViewer } from "@/shared/auth/require-viewer";
import { NewProjectDialog } from "@/features/projects/ui/new-project-dialog";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardProjects } from "@/features/projects/ui/dashboard/dashboard-projects";
import { getDashboard } from "@/features/projects/application/get-dashboard";
import { isAdminEmail } from "@/shared/auth/admin-allowlist";

// Always render per request for the signed-in user; never serve another account's cache.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { user, profile } = await requireViewer();
  if (!profile.role) redirect("/role");
  const isAttorney = profile.role === "attorney";
  const isAdmin = isAdminEmail(user.email);

  const projects = await getDashboard();

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
