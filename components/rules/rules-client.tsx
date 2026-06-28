"use client";

import { type ReactNode, useState, useTransition } from "react";
import { EvidencePane } from "@/components/mpep/evidence-pane";
import { getRuleSection } from "@/lib/validators/run";
import type { MpepSection } from "@/lib/mpep/load";
import type { SurfacedRule, ConditionalRule } from "@/lib/rules/surface";

export function RulesClient({
  appliesNow,
  conditional,
}: {
  appliesNow: SurfacedRule[];
  conditional: ConditionalRule[];
}) {
  const [rule, setRule] = useState<MpepSection | null>(null);
  const [pending, start] = useTransition();

  function open(num: string) {
    start(async () => setRule(await getRuleSection(num)));
  }

  return (
    <div className="flex h-full">
      <div className="w-1/2 shrink-0 space-y-6 overflow-auto border-r border-border px-6 py-5">
        <section>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Applies now
          </p>
          <ul className="mt-2 space-y-2">
            {appliesNow.map((r, i) => (
              <li key={i} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-pass" aria-hidden>
                    ✓
                  </span>
                  <span className="text-xs font-medium text-pass">Applies</span>
                  {!r.actionable && <Tag>Informational</Tag>}
                </div>
                <p className="mt-1 text-sm text-foreground">{r.note}</p>
                <Pins r={r} onOpen={open} />
              </li>
            ))}
          </ul>
        </section>

        <section>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            May apply next
          </p>
          <ul className="mt-2 space-y-2">
            {conditional.map((r, i) => (
              <li
                key={i}
                data-triggered={r.triggered}
                className="rounded-md border border-border p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-block size-2 rounded-full border border-attention"
                    aria-hidden
                  />
                  <span className="text-xs font-medium text-attention-foreground">
                    Conditional
                  </span>
                  {r.triggered && (
                    <span className="rounded-full bg-attention-bg px-1.5 py-0.5 text-[10px] font-medium text-attention-foreground">
                      now applies
                    </span>
                  )}
                  {!r.actionable && <Tag>Informational</Tag>}
                </div>
                <p className="mt-1 text-sm text-foreground">{r.trigger}.</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{r.note}</p>
                <Pins r={r} onOpen={open} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="min-w-0 flex-1 overflow-auto" data-testid="rule-pane">
        {rule ? (
          <EvidencePane section={rule} span={null} />
        ) : (
          <p className="px-6 py-4 text-sm text-muted-foreground">
            {pending ? "Loading…" : "Open a rule to read it here."}
          </p>
        )}
      </div>
    </div>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  );
}

function Pins({
  r,
  onOpen,
}: {
  r: SurfacedRule;
  onOpen: (n: string) => void;
}) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      {r.cfr_ref && <span>{r.cfr_ref}</span>}
      {r.mpep_section && (
        <button
          type="button"
          onClick={() => onOpen(r.mpep_section!)}
          className="underline-offset-2 hover:underline"
        >
          Open MPEP {r.mpep_section}
        </button>
      )}
    </div>
  );
}
