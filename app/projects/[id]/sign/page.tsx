import Link from "next/link";
import { HeaderActions } from "@/components/projects/header-actions";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/projects/queries";
import { getInventors, getDeclarations, getAttachments } from "@/lib/filing/queries";
import { latestDeclarations } from "@/lib/validators/filing";
import { SignClient } from "@/components/filing/sign-client";
import { DeclarationSign } from "@/components/filing/declaration-sign";

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
  const isAttorney = profile.role === "attorney";

  const project = await getProject(id);
  if (!project) notFound();
  const [inventors, declarations, attachments] = await Promise.all([
    getInventors(id),
    getDeclarations(id),
    getAttachments(id),
  ]);
  const declarationDocs = attachments.filter((a) => a.kind === "declaration");
  const current = latestDeclarations(declarations);
  const signed: Record<string, { legal_name: string; signed_at: string }> = {};
  for (const inv of inventors) {
    const d = current.get(inv.id);
    if (d) signed[inv.id] = { legal_name: d.legal_name, signed_at: d.signed_at };
  }

  const declHref = `/api/projects/${id}/declaration`;
  const poaHref = `/api/projects/${id}/declaration?doc=poa`;

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
          <>
            <p className="text-sm text-muted-foreground">
              As the practitioner you file a power of attorney and collect each inventor&apos;s
              signed declaration. You sign prosecution papers as the registered practitioner of
              record; you do not sign the inventor&apos;s oath, so you are not asked to certify
              the inventor statements. Download each document, have it signed, and upload the
              signed copies.
            </p>
            <section>
              <h2 className="text-sm font-semibold text-foreground">Your filing documents</h2>
              <div className="mt-3">
                <DeclarationSign
                  projectId={id}
                  signed={declarationDocs}
                  intro="Download the power of attorney for the applicant to sign, and the inventor declarations for each inventor to sign. Upload the signed copies here. Pincite does not verify the signatures."
                  downloads={[
                    { href: poaHref, label: "Download power of attorney" },
                    { href: declHref, label: "Download inventor declarations" },
                  ]}
                />
              </div>
            </section>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Each inventor confirms the declaration statements (37 CFR 1.63), then downloads the
              declaration, signs it, and uploads the signed copy. The operative signature is the
              one on that document, which Pincite does not verify.
            </p>
            <section>
              <h2 className="text-sm font-semibold text-foreground">
                Inventor certification
              </h2>
              <div className="mt-3">
                <SignClient projectId={id} inventors={inventors} signed={signed} />
              </div>
            </section>
            <section>
              <h2 className="text-sm font-semibold text-foreground">
                Signed declaration document
              </h2>
              <div className="mt-3">
                <DeclarationSign
                  projectId={id}
                  signed={declarationDocs}
                  downloads={[{ href: declHref, label: "Download declaration to sign" }]}
                />
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
