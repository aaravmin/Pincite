"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveInventors, saveApplicant } from "@/lib/filing/actions";
import {
  ENTITY_STATUSES,
  ENTITY_STATUS_LABELS,
  type EntityStatus,
} from "@/lib/projects/sections";
import type { Inventor } from "@/lib/filing/types";

type Row = {
  legal_name: string;
  residence: string;
  mailing_address: string;
  citizenship: string;
};
const EMPTY: Row = {
  legal_name: "",
  residence: "",
  mailing_address: "",
  citizenship: "",
};
const toRow = (i: Inventor): Row => ({
  legal_name: i.legal_name,
  residence: i.residence,
  mailing_address: i.mailing_address,
  citizenship: i.citizenship,
});

export function InventorsForm({
  projectId,
  initialInventors,
  initialApplicant,
}: {
  projectId: string;
  initialInventors: Inventor[];
  initialApplicant: {
    applicant_name: string | null;
    applicant_is_inventor: boolean;
    applicant_is_juristic: boolean;
    entity_status: EntityStatus;
  };
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(
    initialInventors.length ? initialInventors.map(toRow) : [{ ...EMPTY }],
  );
  const [applicantName, setApplicantName] = useState(
    initialApplicant.applicant_name ?? "",
  );
  const [isInventor, setIsInventor] = useState(
    initialApplicant.applicant_is_inventor,
  );
  const [isJuristic, setIsJuristic] = useState(
    initialApplicant.applicant_is_juristic,
  );
  const [entity, setEntity] = useState<EntityStatus>(
    initialApplicant.entity_status,
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function update(idx: number, key: keyof Row, value: string) {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, [key]: value } : row)));
    setMsg(null);
  }
  const addRow = () => setRows((r) => [...r, { ...EMPTY }]);
  const removeRow = (idx: number) =>
    setRows((r) => (r.length > 1 ? r.filter((_, i) => i !== idx) : r));

  function save() {
    setErr(null);
    setMsg(null);
    start(async () => {
      const a = await saveInventors({ projectId, inventors: rows });
      if ("error" in a) return setErr(a.error);
      const b = await saveApplicant({
        projectId,
        applicantName,
        applicantIsInventor: isInventor,
        applicantIsJuristic: isJuristic,
        entityStatus: entity,
      });
      if ("error" in b) return setErr(b.error);
      setMsg("Saved");
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Inventors</h2>
          <Button variant="outline" size="sm" onClick={addRow} data-testid="add-inventor">
            Add inventor
          </Button>
        </div>
        {rows.map((row, idx) => (
          <div key={idx} className="rounded-lg border border-border p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Inventor {idx + 1}
              </span>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`inv-name-${idx}`}>Legal name</Label>
                <Input
                  id={`inv-name-${idx}`}
                  data-testid={`inventor-name-${idx}`}
                  value={row.legal_name}
                  onChange={(e) => update(idx, "legal_name", e.target.value)}
                  placeholder="First Middle Last"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`inv-cit-${idx}`}>Citizenship</Label>
                <Input
                  id={`inv-cit-${idx}`}
                  value={row.citizenship}
                  onChange={(e) => update(idx, "citizenship", e.target.value)}
                  placeholder="e.g. United States"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`inv-res-${idx}`}>Residence (city, state/country)</Label>
                <Input
                  id={`inv-res-${idx}`}
                  value={row.residence}
                  onChange={(e) => update(idx, "residence", e.target.value)}
                  placeholder="e.g. Austin, TX"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`inv-mail-${idx}`}>Mailing address</Label>
                <Input
                  id={`inv-mail-${idx}`}
                  value={row.mailing_address}
                  onChange={(e) => update(idx, "mailing_address", e.target.value)}
                  placeholder="Street, city, state, ZIP"
                />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Applicant &amp; entity</h2>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            className="size-4 accent-[var(--primary)]"
            checked={isInventor}
            onChange={(e) => setIsInventor(e.target.checked)}
          />
          The applicant is the inventor(s)
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            className="size-4 accent-[var(--primary)]"
            checked={isJuristic}
            onChange={(e) => setIsJuristic(e.target.checked)}
          />
          The applicant is a company or other juristic entity
        </label>
        {!isInventor && (
          <div className="space-y-1.5">
            <Label htmlFor="applicant-name">Applicant name</Label>
            <Input
              id="applicant-name"
              data-testid="applicant-name"
              value={applicantName}
              onChange={(e) => setApplicantName(e.target.value)}
              placeholder="Assignee / applicant legal name"
            />
          </div>
        )}
        <div className="max-w-xs space-y-1.5">
          <Label htmlFor="entity-status">Entity status (fees)</Label>
          <Select
            value={entity}
            onValueChange={(v) => setEntity(v as EntityStatus)}
          >
            <SelectTrigger id="entity-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {ENTITY_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending} data-testid="save-filing">
          {pending ? "Saving…" : "Save"}
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
