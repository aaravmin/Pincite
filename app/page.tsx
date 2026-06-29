import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/brand/logo";

// A signed-in visitor skips the landing and goes straight to their dashboard.
export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background px-6">
      <main className="w-full max-w-3xl text-center">
        <Logo className="mx-auto h-24 w-auto" />
        <p className="mx-auto mt-6 text-lg leading-8 text-muted-foreground">
          An active patent review workbench. It flags the rule violations in your draft,
          finds similar public patents, and pins every rule it cites to real MPEP and CFR text.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/login"
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Sign in to start
          </Link>
        </div>
        <p className="mt-10 text-xs text-muted-foreground">
          A legal research aid, not legal advice. You are responsible for the
          confidentiality of anything you enter. Verify anything time sensitive.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>{" "}
          &middot;{" "}
          <Link href="/terms" className="underline">
            Terms of Service
          </Link>
        </p>
      </main>
    </div>
  );
}
