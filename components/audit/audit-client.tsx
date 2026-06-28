"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACTION_LABELS, type AuditEntry } from "@/lib/audit-log";
import { fmtDateTime } from "@/lib/format";

function summarize(detail: Record<string, unknown>): string {
  return Object.entries(detail)
    .map(
      ([k, v]) =>
        `${k}: ${typeof v === "object" && v !== null ? JSON.stringify(v) : String(v)}`,
    )
    .join(" · ")
    .slice(0, 160);
}

export function AuditClient({ entries }: { entries: AuditEntry[] }) {
  const [filter, setFilter] = useState("all");
  const actions = [...new Set(entries.map((e) => e.action))];
  const shown = filter === "all" ? entries : entries.filter((e) => e.action === filter);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-6">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          {shown.length} of {entries.length} actions
        </span>
        <div className="ml-auto w-56">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger aria-label="Filter by action">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {actions.map((a) => (
                <SelectItem key={a} value={a}>
                  {ACTION_LABELS[a] ?? a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ul
        className="mt-4 divide-y divide-border rounded-lg border border-border"
        data-testid="audit-list"
      >
        {shown.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            No actions.
          </li>
        ) : (
          shown.map((e) => (
            <li
              key={e.id}
              className="flex items-start justify-between gap-4 px-4 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {ACTION_LABELS[e.action] ?? e.action}
                </p>
                {e.detail && (
                  <p className="truncate text-xs text-muted-foreground">
                    {summarize(e.detail)}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {fmtDateTime(e.created_at)}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
