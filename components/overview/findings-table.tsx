"use client";

// An interactive, sortable, filterable findings table for the command center.
// Fed by the SAME live findings as the KPI counts (getReadiness), so it never
// disagrees. Row hover previews the plain finding + its citation; row click
// opens the issue in context. Presentation only, no finding is changed here.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import { SignalBadge } from "@visual/signal";
import { signalFromSeverity } from "@visual/types";
import type { OverviewFinding } from "@/lib/readiness";

const SEV_RANK: Record<string, number> = { violation: 0, attention: 1, pass: 2 };

function Th({ children, onClick, sortable }: { children: React.ReactNode; onClick?: () => void; sortable?: boolean }) {
  return (
    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
      {sortable ? (
        <button type="button" onClick={onClick} className="inline-flex items-center gap-1 hover:text-foreground">
          {children}
          <ArrowUpDown className="size-3" aria-hidden />
        </button>
      ) : (
        children
      )}
    </th>
  );
}

export function FindingsTable({ findings }: { findings: OverviewFinding[] }) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([{ id: "severity", desc: false }]);
  const [severity, setSeverity] = useState<"all" | "violation" | "attention">("all");
  const [area, setArea] = useState<"all" | OverviewFinding["area"]>("all");

  const data = useMemo(
    () =>
      findings.filter(
        (f) =>
          (severity === "all" || f.severity === severity) &&
          (area === "all" || f.area === area),
      ),
    [findings, severity, area],
  );

  const columns = useMemo<ColumnDef<OverviewFinding>[]>(
    () => [
      {
        accessorKey: "severity",
        header: "Signal",
        sortingFn: (a, b) => SEV_RANK[a.original.severity] - SEV_RANK[b.original.severity],
        cell: ({ row }) => (
          <SignalBadge signal={signalFromSeverity(row.original.severity)}>
            {row.original.severity === "violation" ? "Violation" : "Attention"}
          </SignalBadge>
        ),
      },
      {
        accessorKey: "title",
        header: "Finding",
        cell: ({ row }) => {
          const f = row.original;
          return (
            <HoverCard openDelay={80} closeDelay={40}>
              <HoverCardTrigger asChild>
                <span className="font-medium text-foreground underline-offset-2 hover:underline">
                  {f.title}
                </span>
              </HoverCardTrigger>
              <HoverCardContent align="start" className="w-80">
                <p className="text-sm text-muted-foreground">{f.explanation}</p>
                {(f.cfr_ref || f.mpep_section) && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t pt-3 font-mono text-xs">
                    {f.cfr_ref ? (
                      <span className="rounded border bg-muted/50 px-1.5 py-0.5 text-muted-foreground">
                        {f.cfr_ref}
                      </span>
                    ) : null}
                    {f.mpep_section ? (
                      <span className="rounded border bg-muted/50 px-1.5 py-0.5 text-muted-foreground">
                        MPEP {f.mpep_section}
                      </span>
                    ) : null}
                  </div>
                )}
              </HoverCardContent>
            </HoverCard>
          );
        },
      },
      { accessorKey: "area", header: "Area", cell: ({ row }) => <span className="text-muted-foreground">{row.original.area}</span> },
      {
        id: "rule",
        header: "Rule",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.mpep_section ? `MPEP ${row.original.mpep_section}` : row.original.cfr_ref || "—"}
          </span>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const areas: ("all" | OverviewFinding["area"])[] = ["all", "Claims", "Specification", "Filing"];
  const sevs: ("all" | "violation" | "attention")[] = ["all", "violation", "attention"];

  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5">
        <h2 className="text-sm font-semibold text-foreground">Findings</h2>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {sevs.map((s) => (
            <Chip key={s} active={severity === s} onClick={() => setSeverity(s)}>
              {s === "all" ? "All" : s === "violation" ? "Violations" : "Attention"}
            </Chip>
          ))}
          <span className="mx-1 h-4 w-px bg-border" aria-hidden />
          {areas.map((a) => (
            <Chip key={a} active={area === a} onClick={() => setArea(a)}>
              {a === "all" ? "All areas" : a}
            </Chip>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          No findings match this filter.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <Th
                      key={h.id}
                      sortable={h.column.getCanSort()}
                      onClick={h.column.getToggleSortingHandler() as (() => void) | undefined}
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </Th>
                  ))}
                  <th className="w-8" />
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => router.push(row.original.href)}
                  className="group cursor-pointer border-b last:border-0 transition-colors hover:bg-accent/40"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2.5 align-top">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                  <td className="pr-3 align-middle">
                    <ArrowRight
                      className="size-4 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground"
                      aria-hidden
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 font-medium transition-colors",
        active ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
