"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EvidencePane } from "@/components/mpep/evidence-pane";
import { askMpep } from "@/lib/mpep/ask";
import type { AskResult } from "@/lib/mpep/types";

export function AskClient() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<AskResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(query: string) {
    setErr(null);
    start(async () => {
      const r = await askMpep(query);
      if ("error" in r) {
        setErr(r.error);
        setRes(null);
        return;
      }
      setRes(r);
    });
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    run(q);
  }

  function openSection(num: string) {
    setQ(num);
    run(num);
  }

  useEffect(() => {
    if (res?.section) {
      document
        .getElementById("evidence-highlight")
        ?.scrollIntoView({ block: "center" });
    }
  }, [res]);

  return (
    <div className="flex h-full flex-col">
      <form
        onSubmit={submit}
        className="flex gap-2 border-b border-border px-6 py-3"
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask a procedure question, or enter an MPEP section like 2111.03"
          data-testid="ask-input"
        />
        <Button type="submit" disabled={pending || !q.trim()}>
          {pending ? "Searching…" : "Ask"}
        </Button>
      </form>

      {err && <p className="px-6 py-3 text-sm text-muted-foreground">{err}</p>}

      {res && (
        <div className="flex min-h-0 flex-1">
          <aside className="w-2/5 shrink-0 overflow-auto border-r border-border px-6 py-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Governing rule
            </p>
            {res.section ? (
              <div className="mt-2">
                <p className="text-sm font-semibold text-foreground">
                  MPEP {res.section.section_number}
                </p>
                {res.section.title && (
                  <p className="text-sm text-foreground">{res.section.title}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Validated against the corpus. The responsive passage is
                  highlighted on the right.
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No section in the corpus matched. Try different words or an exact
                section number.
              </p>
            )}

            {res.requested.dropped.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Dropped
                </p>
                <p className="mt-1 text-sm text-foreground">
                  Not in the corpus, so not shown:{" "}
                  {res.requested.dropped.join(", ")}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  No claim reaches the screen without a citation that resolves to
                  real text.
                </p>
              </div>
            )}

            {res.alternatives.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Other possibly relevant
                </p>
                <ul className="mt-1 space-y-1">
                  {res.alternatives.map((a) => (
                    <li key={a.section_number}>
                      <button
                        type="button"
                        onClick={() => openSection(a.section_number)}
                        className="text-left text-sm text-foreground underline-offset-2 hover:underline"
                      >
                        MPEP {a.section_number}
                        {a.title ? ` - ${a.title}` : ""}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>

          <section className="min-w-0 flex-1" data-testid="evidence">
            {res.section ? (
              <EvidencePane section={res.section} span={res.span} />
            ) : (
              <p className="px-6 py-5 text-sm text-muted-foreground">
                No matching MPEP section found in the corpus.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
