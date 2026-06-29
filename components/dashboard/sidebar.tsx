import Link from "next/link";
import { LayoutDashboard, BookText, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

/**
 * The dashboard sidebar (the spine, per the UI brief). It holds the persistent globally
 * relevant elements. The profile sits at the top, the nav in the middle with an active
 * state, and sign out at the bottom.
 */
export function DashboardSidebar({
  email,
  active = "dashboard",
}: {
  email: string;
  active?: "dashboard" | "ask";
}) {
  const initial = (email.trim()[0] ?? "?").toUpperCase();
  const link = (
    href: string,
    label: string,
    Icon: typeof LayoutDashboard,
    key: "dashboard" | "ask",
  ) => (
    <Link
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm ${
        active === key
          ? "bg-accent font-medium text-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      }`}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {label}
    </Link>
  );

  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-border bg-secondary/20 p-3 md:flex">
      <div className="px-2 py-2">
        <Logo className="h-8 w-auto" />
      </div>

      <nav aria-label="Main" className="mt-3 space-y-0.5">
        {link("/dashboard", "Dashboard", LayoutDashboard, "dashboard")}
        {link("/ask", "Ask the MPEP", BookText, "ask")}
      </nav>

      <div className="mt-auto space-y-1 border-t border-border pt-3">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
            aria-hidden
          >
            {initial}
          </span>
          <p
            className="min-w-0 truncate text-xs text-muted-foreground"
            title={email}
          >
            {email}
          </p>
        </div>
        <form action="/auth/signout" method="post">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}
