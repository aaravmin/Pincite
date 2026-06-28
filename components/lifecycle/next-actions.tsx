import type { LifecycleAction } from "@/lib/lifecycle/actions";

// Time-bound actions are styled with the attention (yellow) signal plus an explicit
// "Deadline" label, so color is never the only signal.
export function NextActions({ actions }: { actions: LifecycleAction[] }) {
  if (actions.length === 0) return null;
  return (
    <section className="mx-auto w-full max-w-3xl px-6 pb-12">
      <h2 className="text-sm font-semibold text-foreground">What to do now</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Required steps for this stage, pinned to the governing rule. Pincite does not
        file or pay for you.
      </p>
      <ul className="mt-3 space-y-2">
        {actions.map((a, i) => (
          <li key={i} className="rounded-lg border border-border p-3">
            <div className="flex items-start gap-2.5">
              <span
                className="mt-1 size-2.5 shrink-0 rounded-full border-2 border-attention"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{a.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{a.detail}</p>
                {a.deadline && (
                  <p className="mt-1 text-xs font-medium text-attention-foreground">
                    Deadline: {a.deadline}
                  </p>
                )}
                {(a.cfr_ref || a.mpep_section) && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[a.cfr_ref, a.mpep_section ? `MPEP ${a.mpep_section}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
