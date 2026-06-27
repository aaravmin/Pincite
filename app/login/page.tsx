import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background px-6">
      <main className="w-full max-w-sm">
        <Link
          href="/"
          className="block text-center text-2xl font-semibold tracking-tight text-foreground"
        >
          Pincite
        </Link>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Sign in to open your patent review workspace.
        </p>
        <div className="mt-8">
          <Suspense fallback={<div className="h-11" />}>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          A legal research aid, not legal advice. You are responsible for the
          confidentiality of anything you enter.
        </p>
      </main>
    </div>
  );
}
