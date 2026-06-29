"use client";

import { type ReactNode } from "react";
import { parseClaims } from "@/lib/patent/claims";

/**
 * A read-only tree of the claims parsed from the plain-text editor: independent claims as
 * roots, each dependent claim nested under the claim it refers back to. The editor stays
 * plain text (so finding offsets are stable); this just visualizes the structure.
 */
export function ClaimTree({ text }: { text: string }) {
  const claims = parseClaims(text);
  if (claims.length === 0) return null;

  const byNum = new Map(claims.map((c) => [c.number, c]));
  const parentOf = (raw: string, self: number): number | null => {
    const m = raw.match(/\bclaim\s+(\d+)\b/i);
    const p = m ? Number(m[1]) : null;
    return p && p !== self && byNum.has(p) ? p : null;
  };

  const children = new Map<number, number[]>();
  const roots: number[] = [];
  for (const c of claims) {
    const p = parentOf(c.raw, c.number);
    if (p) children.set(p, [...(children.get(p) ?? []), c.number]);
    else roots.push(c.number);
  }

  const preview = (n: number): string => {
    const c = byNum.get(n)!;
    const txt = (c.preamble || c.raw).replace(/\s+/g, " ").trim();
    return txt.length > 80 ? txt.slice(0, 80) + "…" : txt;
  };

  const render = (n: number, depth: number): ReactNode => {
    const kids = children.get(n) ?? [];
    return (
      <li key={n}>
        <div
          className="flex items-baseline gap-2 py-0.5"
          style={{ paddingLeft: depth * 18 }}
        >
          <span className="shrink-0 text-xs font-medium text-foreground">
            Claim {n}
          </span>
          <span className="shrink-0 rounded-full border border-border px-1.5 text-[10px] text-muted-foreground">
            {depth === 0 ? "independent" : `dependent on ${parentOf(byNum.get(n)!.raw, n)}`}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {preview(n)}
          </span>
        </div>
        {kids.length > 0 && <ul>{kids.map((k) => render(k, depth + 1))}</ul>}
      </li>
    );
  };

  return <ul className="mt-1 space-y-0.5">{roots.map((r) => render(r, 0))}</ul>;
}
