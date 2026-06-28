"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveDisclosure } from "@/lib/disclosure/actions";
import {
  DISCLOSURE_FIELDS,
  type Disclosure,
  type DisclosureKey,
} from "@/lib/disclosure/types";

export function DisclosureForm({
  projectId,
  initial,
}: {
  projectId: string;
  initial: Disclosure;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Disclosure>(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function set(key: DisclosureKey, v: string) {
    setValues((p) => ({ ...p, [key]: v }));
    setMsg(null);
  }

  function save() {
    setErr(null);
    setMsg(null);
    start(async () => {
      const r = await saveDisclosure({ projectId, values });
      if ("error" in r) return setErr(r.error);
      setMsg("Saved");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {DISCLOSURE_FIELDS.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <Label htmlFor={`disc-${f.key}`}>{f.label}</Label>
          <p className="text-xs text-muted-foreground">{f.hint}</p>
          <Textarea
            id={`disc-${f.key}`}
            data-testid={`disclosure-${f.key}`}
            value={values[f.key]}
            onChange={(e) => set(f.key, e.target.value)}
            rows={f.key === "components" || f.key === "how_it_works" ? 5 : 3}
          />
        </div>
      ))}
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending} data-testid="save-disclosure">
          {pending ? "Saving…" : "Save disclosure"}
        </Button>
        {msg && <span className="text-sm text-pass">{msg}</span>}
        {err && (
          <span className="text-sm text-violation" role="alert">
            {err}
          </span>
        )}
      </div>
    </div>
  );
}
