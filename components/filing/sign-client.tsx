"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signDeclaration } from "@/lib/filing/actions";
import {
  isValidSSignature,
  type Inventor,
  type DeclarationStatements,
} from "@/lib/filing/types";

const STATEMENTS: { key: keyof DeclarationStatements; text: string }[] = [
  {
    key: "made_or_authorized",
    text: "This application was made or authorized to be made by me.",
  },
  {
    key: "original_inventor",
    text: "I believe I am the original inventor or an original joint inventor of a claimed invention in the application.",
  },
  {
    key: "reviewed_understood",
    text: "I have reviewed and understand the contents of the application, including the claims.",
  },
  {
    key: "duty_to_disclose",
    text: "I am aware of the duty to disclose to the USPTO all information known to be material to patentability (37 CFR 1.56).",
  },
  {
    key: "penalty_acknowledged",
    text: "I acknowledge that willful false statements are punishable under 18 U.S.C. 1001 by fine or imprisonment of up to 5 years, or both.",
  },
];

const emptyStatements = (): DeclarationStatements => ({
  made_or_authorized: false,
  original_inventor: false,
  reviewed_understood: false,
  duty_to_disclose: false,
  penalty_acknowledged: false,
});

function InventorSign({
  projectId,
  inventor,
  signedInfo,
}: {
  projectId: string;
  inventor: Inventor;
  signedInfo?: { legal_name: string; signed_at: string; s_signature?: string | null };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(!signedInfo);
  const [name, setName] = useState(inventor.legal_name);
  const [sig, setSig] = useState("");
  const [st, setSt] = useState<DeclarationStatements>(emptyStatements());
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const allChecked = STATEMENTS.every((s) => st[s.key]);
  const sigOk = isValidSSignature(sig);

  function sign() {
    setErr(null);
    start(async () => {
      const res = await signDeclaration({
        projectId,
        inventorId: inventor.id,
        legalName: name,
        sSignature: sig,
        statements: st,
      });
      if ("error" in res) return setErr(res.error);
      setOpen(false);
      setSt(emptyStatements());
      setSig("");
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            {inventor.legal_name || "Unnamed inventor"}
          </p>
          {signedInfo ? (
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-pass">
              <span
                className="inline-block size-2.5 rounded-full bg-pass"
                aria-hidden
              />
              Signed{" "}
              <span className="font-mono text-foreground">
                {signedInfo.s_signature || `/${signedInfo.legal_name}/`}
              </span>{" "}
              on {new Date(signedInfo.signed_at).toLocaleDateString()}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">Not yet signed</p>
          )}
        </div>
        {signedInfo && !open && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            Sign again
          </Button>
        )}
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          {STATEMENTS.map((s) => (
            <label
              key={s.key}
              className="flex items-start gap-2 text-sm text-foreground"
            >
              <input
                type="checkbox"
                className="mt-1 size-4 accent-[var(--primary)]"
                checked={st[s.key]}
                onChange={(e) =>
                  setSt((p) => ({ ...p, [s.key]: e.target.checked }))
                }
              />
              <span>{s.text}</span>
            </label>
          ))}
          <div className="max-w-sm space-y-1.5">
            <Label htmlFor={`sign-name-${inventor.id}`}>Printed full legal name</Label>
            <Input
              id={`sign-name-${inventor.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First Middle Last"
            />
          </div>
          <div className="max-w-sm space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={`sign-sig-${inventor.id}`}>S-signature</Label>
              <button
                type="button"
                onClick={() => setSig(`/${name.trim()}/`)}
                disabled={!name.trim()}
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-40"
              >
                Insert /{name.trim() || "Name"}/
              </button>
            </div>
            <Input
              id={`sign-sig-${inventor.id}`}
              value={sig}
              onChange={(e) => setSig(e.target.value)}
              placeholder="/First M. Last/"
              className="font-mono"
              aria-invalid={sig.length > 0 && !sigOk}
            />
            <p className="text-xs text-muted-foreground">
              Sign by inserting your name between two forward slashes, for example
              {" "}
              <span className="font-mono">/First M. Last/</span> - the USPTO S-signature
              (37 CFR 1.4(d)). This records your attestation; the operative signature is the
              one on the paper you submit to the USPTO.
            </p>
            {sig.length > 0 && !sigOk && (
              <p className="text-xs text-violation">
                Put your name between forward slashes, e.g. /First M. Last/.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={sign}
              disabled={pending || !name.trim() || !allChecked || !sigOk}
            >
              {pending ? "Signing…" : "Sign declaration"}
            </Button>
            {!allChecked && (
              <span className="text-xs text-muted-foreground">
                Check all statements to sign.
              </span>
            )}
            {err && (
              <span className="text-sm text-violation" role="alert">
                {err}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function SignClient({
  projectId,
  inventors,
  signed,
}: {
  projectId: string;
  inventors: Inventor[];
  signed: Record<
    string,
    { legal_name: string; signed_at: string; s_signature?: string | null }
  >;
}) {
  if (inventors.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add inventors first on the Inventors &amp; applicant step.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Each inventor reviews the application and confirms the statements below - the inventor&apos;s
        oath or declaration the USPTO requires (37 CFR 1.63). Check every statement, enter the
        printed legal name, and sign with an S-signature: your name between forward slashes, for
        example /First M. Last/ (37 CFR 1.4(d)).
      </p>
      {inventors.map((inv) => (
        <InventorSign
          key={inv.id}
          projectId={projectId}
          inventor={inv}
          signedInfo={signed[inv.id]}
        />
      ))}
    </div>
  );
}
