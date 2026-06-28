import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";

export default async function RolePage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!profile.consented_at) redirect("/consent");
  if (profile.role) redirect("/dashboard");

  const cardClass =
    "flex h-full w-full flex-col rounded-lg border border-border p-5 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">
      <main className="w-full max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          How will you use Pincite?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This tailors the workflow. The signing step and your dashboard depend on it.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <form action="/role/accept" method="post">
            <input type="hidden" name="role" value="inventor" />
            <button type="submit" className={cardClass}>
              <span className="text-base font-medium text-foreground">
                I&apos;m an inventor filing on my own
              </span>
              <span className="mt-2 text-sm text-muted-foreground">
                A guided, plain-English flow. You&apos;ll personally sign the inventor&apos;s
                declaration, and Pincite checks it for defects before you file.
              </span>
            </button>
          </form>

          <form action="/role/accept" method="post">
            <input type="hidden" name="role" value="attorney" />
            <button type="submit" className={cardClass}>
              <span className="text-base font-medium text-foreground">
                I&apos;m a patent attorney or agent
              </span>
              <span className="mt-2 text-sm text-muted-foreground">
                A denser portfolio across clients and matters. You manage the power of
                attorney and sign the prosecution papers; inventors still sign their oath.
              </span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
