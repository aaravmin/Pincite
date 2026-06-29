import Link from "next/link";
import { HeaderActions } from "@/components/projects/header-actions";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProject, getSectionContent } from "@/lib/projects/queries";
import { getInventors, getDeclarations } from "@/lib/filing/queries";
import {
  runFilingChecks,
  resolveFilingPins,
  latestDeclarations,
} from "@/lib/validators/filing";
import { SignClient } from "@/components/filing/sign-client";
import { FilingReadiness } from "@/components/filing/filing-readiness";

export default async function SignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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
  const role = profile.role ?? null;
  const isAttorney = role === "attorney";

  const project = await getProject(id);
  if (!project) notFound();
  const [inventors, declarations, sections] = await Promise.all([
    getInventors(id),
    getDeclarations(id),
    getSectionContent(id),
  ]);
  const findings = await resolveFilingPins(
    runFilingChecks({
      project,
      inventors,
      declarations,
      role,
      title: sections["title"] ?? "",
    }),
  );
  const current = latestDeclarations(declarations);
  const signed: Record<string, { legal_name: string; signed_at: string }> = {};
  for (const inv of inventors) {
    const d = current.get(inv.id);
    if (d) signed[inv.id] = { legal_name: d.legal_name, signed_at: d.signed_at };
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← {project.name}
          </Link>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Sign documents
          </span>
        </div>
        <HeaderActions projectId={id} />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-6 py-8">
        {isAttorney ? (
          <div className="rounded-md border border-border px-4 py-3 text-sm text-muted-foreground">
            As the practitioner you file a power of attorney (PTO/AIA/82) and sign the
            prosecution papers. Each inventor still must personally sign their declaration
            (PTO/AIA/01); record their signed declarations below.
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Each inventor personally signs the inventor&apos;s declaration (PTO/AIA/01).
            Read each statement, then type your full legal name to sign. Pincite records it
            and checks it for defects before you file.
          </p>
        )}

        <section>
          <h2 className="text-sm font-semibold text-foreground">Filing readiness</h2>
          <div className="mt-3">
            <FilingReadiness findings={findings} />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-foreground">
            Inventor declarations
          </h2>
          <div className="mt-3">
            <SignClient projectId={id} inventors={inventors} signed={signed} />
          </div>
        </section>
      </main>
    </div>
  );
}
