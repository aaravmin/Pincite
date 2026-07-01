import { HeaderActions } from "@/components/projects/header-actions";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/projects/queries";
import { getInventors, getAttachments } from "@/lib/filing/queries";
import { DeclarationSign } from "@/components/filing/declaration-sign";
import { DECLARATION_STATEMENTS } from "@/lib/export/filing-package";
import type { Inventor } from "@/lib/filing/types";

/**
 * What the declaration says, shown read-only so the signer knows what they are signing. This
 * is reference text, never a signature - the operative signature is the one the inventor
 * places on the downloaded document by hand.
 */
function DeclarationStatementsCard({ inventors }: { inventors: Inventor[] }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-sm font-medium text-foreground">
        What the declaration states (37 CFR 1.63)
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        By signing the document, each inventor declares, under penalty under 18 U.S.C. 1001,
        that:
      </p>
      <ul className="mt-3 space-y-2">
        {DECLARATION_STATEMENTS.map((s) => (
          <li key={s} className="flex items-start gap-2 text-sm text-foreground">
            <span
              className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-muted-foreground"
              aria-hidden
            />
            <span>{s}</span>
          </li>
        ))}
      </ul>
      {inventors.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-xs font-medium text-foreground">
            Inventor{inventors.length === 1 ? "" : "s"} who must sign:
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {inventors.map((inv) => (
              <li key={inv.id} className="text-sm text-muted-foreground">
                {inv.legal_name || "Unnamed inventor"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

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
  const [inventors, attachments] = await Promise.all([
    getInventors(id),
    getAttachments(id),
  ]);
  const declarationDocs = attachments.filter((a) => a.kind === "declaration");

  const declHref = `/api/projects/${id}/declaration`;
  const poaHref = `/api/projects/${id}/declaration?doc=poa`;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Sign documents
          </span>
        </div>
        <HeaderActions projectId={id} />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-6 py-8">
        {isAttorney ? (
          <p className="text-sm text-muted-foreground">
            File the power of attorney and collect each inventor&apos;s signed declaration - you
            don&apos;t sign the inventor&apos;s oath. Download each, get it signed, upload the
            signed copy. Pincite doesn&apos;t verify signatures.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Each inventor signs the declaration (37 CFR 1.63) by hand and uploads the signed
            copy. Pincite doesn&apos;t verify it.
          </p>
        )}

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            Inventor&apos;s declaration (37 CFR 1.63)
          </h2>
          <DeclarationStatementsCard inventors={inventors} />
        </section>

        <section>
          <h2 className="text-sm font-semibold text-foreground">
            Signed declaration document
          </h2>
          <div className="mt-3">
            <DeclarationSign
              projectId={id}
              signed={declarationDocs}
              intro={
                isAttorney
                  ? "Upload the signed copies here; they go into your filing package."
                  : "Upload the signed copy here; it goes into your filing package."
              }
              downloads={
                isAttorney
                  ? [
                      { href: poaHref, label: "Download power of attorney" },
                      { href: declHref, label: "Download inventor declarations" },
                    ]
                  : [{ href: declHref, label: "Download declaration to sign" }]
              }
            />
          </div>
        </section>
      </main>
    </div>
  );
}
