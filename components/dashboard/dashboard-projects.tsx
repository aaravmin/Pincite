"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PATENT_TYPE_LABELS,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
} from "@/lib/projects/sections";
import { nextStep } from "@/lib/projects/next-step";
import { fmtDate } from "@/lib/format";
import { PortfolioTable } from "@/components/projects/portfolio-table";
import { DeleteProjectButton } from "@/components/dashboard/delete-project-button";
import type { DashboardProject } from "@/lib/projects/queries";

export function DashboardProjects({
  projects,
  isAttorney,
  isAdmin,
}: {
  projects: DashboardProject[];
  isAttorney: boolean;
  isAdmin: boolean;
}) {
  const [status, setStatus] = useState<string>("all");

  if (projects.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
        <p className="text-sm font-medium text-foreground">No projects yet</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Create your first project to start the structured intake. Your workspace is
          ready and your session is secure.
        </p>
      </div>
    );
  }

  const counts = new Map<string, number>();
  for (const p of projects) {
    counts.set(p.declared_status, (counts.get(p.declared_status) ?? 0) + 1);
  }
  const filtered =
    status === "all"
      ? projects
      : projects.filter((p) => p.declared_status === status);

  return (
    <div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {PROJECT_STATUSES.filter((s) => counts.get(s)).map((s) => (
            <span key={s}>
              {counts.get(s)} {PROJECT_STATUS_LABELS[s]}
            </span>
          ))}
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {PROJECT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {PROJECT_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No applications with that status.
        </p>
      ) : isAttorney ? (
        <PortfolioTable projects={filtered} isAdmin={isAdmin} />
      ) : (
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border">
          {filtered.map((p) => {
            const ns = nextStep(p.declared_status);
            return (
              <li
                key={p.id}
                className="flex items-center gap-4 px-4 py-3 hover:bg-accent/40"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/projects/${p.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {p.name}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">
                      {PATENT_TYPE_LABELS[p.patent_type]}
                    </Badge>
                    <span>{p.stage}</span>
                    <span>· {p.completeness}% complete</span>
                    {p.openReds > 0 && (
                      <span className="text-violation">· {p.openReds} to fix</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs ${
                      ns.urgent
                        ? "border-attention text-attention-foreground"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {ns.urgent && (
                      <span
                        className="size-1.5 rounded-full bg-attention"
                        aria-hidden
                      />
                    )}
                    {ns.label}
                  </span>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {fmtDate(p.updated_at)}
                  </div>
                </div>
                {isAdmin && (
                  <DeleteProjectButton projectId={p.id} name={p.name} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
