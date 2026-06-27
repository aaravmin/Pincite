import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function ConsentPage() {
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
  if (profile?.consented_at) redirect("/dashboard");

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">
      <main className="w-full max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Before you begin
        </h1>
        <div className="mt-6 space-y-4 text-sm leading-6 text-foreground">
          <p>
            Pincite is a legal research and review aid. It is{" "}
            <span className="font-medium">not legal advice</span> and not a
            drafting or filing service. It surfaces rules and similar public
            patents, each pinned to its source, so you can verify them yourself. A
            human stays in the loop by design.
          </p>
          <p>
            <span className="font-medium">
              You are responsible for the confidentiality of everything you
              enter.
            </span>{" "}
            Do not paste matter you are not authorized to process. Findings and
            similarity results are research signals to verify, not legal
            conclusions about validity, patentability, or freedom to operate.
          </p>
          <p className="rounded-md border border-attention bg-attention-bg px-4 py-3 text-attention-foreground">
            This build is for evaluation with non-confidential, synthetic patent
            text only. Do not enter real unfiled invention text until the
            confidentiality controls are confirmed.
          </p>
        </div>

        <form action="/consent/accept" method="post" className="mt-8">
          <Button type="submit" size="lg">
            I understand, continue
          </Button>
        </form>
      </main>
    </div>
  );
}
