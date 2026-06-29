"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateRole } from "@/lib/profile-actions";
import type { UserRole } from "@/lib/profile";

export function RoleSwitch({ current }: { current: UserRole | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function pick(role: UserRole) {
    if (role === current) return;
    setErr(null);
    start(async () => {
      const r = await updateRole(role);
      if ("error" in r) {
        setErr(r.error);
        return;
      }
      router.refresh();
    });
  }

  const opt = (role: UserRole, label: string, desc: string) => (
    <button
      type="button"
      onClick={() => pick(role)}
      disabled={pending}
      aria-pressed={current === role}
      className={
        "flex-1 rounded-lg border p-4 text-left transition-colors disabled:opacity-60 " +
        (current === role
          ? "border-foreground bg-accent/40"
          : "border-border hover:bg-accent/30")
      }
    >
      <span className="block text-sm font-medium text-foreground">{label}</span>
      <span className="mt-1 block text-xs text-muted-foreground">{desc}</span>
      {current === role && (
        <span className="mt-2 inline-block text-xs font-medium text-pass">
          Current
        </span>
      )}
    </button>
  );

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        {opt(
          "attorney",
          "Patent agent / attorney",
          "Denser portfolio across clients and matters; you manage the power of attorney and sign prosecution papers.",
        )}
        {opt(
          "inventor",
          "Pro se inventor",
          "A guided, plain-English flow; you personally sign the inventor's declaration before filing.",
        )}
      </div>
      {err && (
        <p className="mt-2 text-sm text-violation" role="alert">
          {err}
        </p>
      )}
    </div>
  );
}
