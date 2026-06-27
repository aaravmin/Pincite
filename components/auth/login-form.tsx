"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("redirectTo") ?? "/dashboard";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button onClick={signInWithGoogle} disabled={loading} size="lg">
        {loading ? "Redirecting…" : "Continue with Google"}
      </Button>
      {error ? (
        <p className="text-sm text-violation" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
