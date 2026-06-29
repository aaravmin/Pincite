import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { ThemeToggle } from "@/components/settings/theme-toggle";
import { RoleSwitch } from "@/components/settings/role-switch";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/lib/profile";

export const dynamic = "force-dynamic";

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-md">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="shrink-0">{children}</div>
      </div>
    </section>
  );
}

export default async function SettingsPage() {
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

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar email={user.email ?? ""} active="settings" />
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-3xl px-6 py-10">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Appearance, your role, and your activity record.
          </p>

          <div className="mt-6">
            <Row
              title="Appearance"
              description="Use a light or dark theme. Your choice is saved on this device."
            >
              <ThemeToggle />
            </Row>

            <Row
              title="Your role"
              description="Switch between the patent agent/attorney workflow and the pro se inventor flow at any time. This changes the steps and the signing path; your work is kept."
            >
              <div className="w-full sm:w-[28rem]">
                <RoleSwitch current={(profile.role as UserRole | null) ?? null} />
              </div>
            </Row>

            <Row
              title="Audit log"
              description="Every save, check, search, and sign is recorded. Download your full activity history as a CSV."
            >
              <Button asChild variant="outline" size="sm">
                <a href="/api/audit/export" download>
                  Export audit log (CSV)
                </a>
              </Button>
            </Row>

            <Row
              title="Account"
              description={`Signed in as ${user.email ?? "your account"}. Signing out clears this session on this device.`}
            >
              <form action="/auth/signout" method="post">
                <Button type="submit" variant="outline" size="sm">
                  Sign out
                </Button>
              </form>
            </Row>
          </div>
        </div>
      </main>
    </div>
  );
}
