import { DECLARATION_STATEMENTS } from "@/lib/export/filing-package";
import type { Inventor } from "@/features/filing/domain/types";

/**
 * What the declaration says, shown read-only so the signer knows what they are signing. This
 * is reference text, never a signature - the operative signature is the one the inventor
 * places on the downloaded document by hand.
 */
export function DeclarationStatementsCard({ inventors }: { inventors: Inventor[] }) {
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
