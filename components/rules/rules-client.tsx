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

  // A condition that is already met belongs with the rules that apply now, not under
  // "may apply next" - otherwise the same card both says "if this happens" and "now
  // applies", which is the contradiction this screen used to show.
  const nowApplies = conditional.filter((r) => r.triggered);
  const mayApply = conditional.filter((r) => !r.triggered);

  return (
    <div className="flex h-full">
      <div className="w-1/2 shrink-0 space-y-6 overflow-auto border-r border-border px-6 py-5">
        <section>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Applies now
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Rules that govern your draft as it stands today.
          </p>
          <ul className="mt-2 space-y-2">
            {appliesNow.map((r, i) => (
              <li key={i} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-pass" aria-hidden>
                    ✓
                  </span>
                  <span className="text-xs font-medium text-pass">Applies</span>
                  {!r.actionable && <Tag>Heads-up only</Tag>}
                </div>
                <p className="mt-1 text-sm text-foreground">{r.note}</p>
                {r.reason && (
                  <p className="mt-1 text-xs text-muted-foreground">{r.reason}</p>
                )}
                <Pins r={r} onOpen={open} />
              </li>
            ))}
            {nowApplies.map((r, i) => (
              <li
                key={`c${i}`}
                data-triggered="true"
                className="rounded-md border border-attention bg-attention-bg p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-block size-2 rounded-full bg-attention"
                    aria-hidden
                  />
                  <span className="text-xs font-medium text-attention-foreground">
                    Now applies
                  </span>
                  {!r.actionable && <Tag>Heads-up only</Tag>}
                </div>
                <p className="mt-1 text-sm text-foreground">{r.met}.</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{r.note}</p>
                <Pins r={r} onOpen={open} />
              </li>
            ))}
          </ul>
        </section>

        <section>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            May apply next
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            These don&apos;t apply yet. Each one starts to apply only if the situation
            described happens.
          </p>
          <ul className="mt-2 space-y-2">
            {mayApply.map((r, i) => (
              <li
                key={i}
                data-triggered="false"
                className="rounded-md border border-border p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-block size-2 rounded-full border border-attention"
                    aria-hidden
                  />
                  <span className="text-xs font-medium text-attention-foreground">
                    Not yet
                  </span>
                  {!r.actionable && <Tag>Heads-up only</Tag>}
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
