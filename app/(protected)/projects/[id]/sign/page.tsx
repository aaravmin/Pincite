import { notFound } from "next/navigation";
import { requireViewer } from "@/shared/auth/require-viewer";
import { HeaderActions } from "@/features/projects/ui/header-actions";
import { getSignPage } from "@/features/filing/application/get-sign-page";
import { DeclarationSign } from "@/features/filing/ui/declaration-sign";
import { DeclarationStatementsCard } from "@/features/filing/ui/declaration-statements";

export default async function SignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireViewer();

  const model = await getSignPage(id);
  if (!model) notFound();
  const { inventors, declarationDocs, isAttorney, hrefs } = model;

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
                      { href: hrefs.poa, label: "Download power of attorney" },
                      { href: hrefs.declaration, label: "Download inventor declarations" },
                    ]
                  : [{ href: hrefs.declaration, label: "Download declaration to sign" }]
              }
            />
          </div>
        </section>
      </main>
    </div>
  );
}
