import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/brand/logo";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background px-6">
      <main className="w-full max-w-sm">
        <Link href="/" className="block">
          <Logo className="mx-auto h-9 w-auto" />
        </Link>
        <h1 className="mt-6 text-center text-xl font-semibold tracking-tight text-foreground">
          Sign in
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Open your patent review workspace.
        </p>
        <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm">
          <Suspense fallback={<div className="h-64" />}>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          A legal research aid, not legal advice. You are responsible for the
          confidentiality of anything you enter.
        </p>
      </main>
    </div>
  );
}
