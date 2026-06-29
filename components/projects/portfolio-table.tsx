import { Fragment } from "react";
import Link from "next/link";
import type { DashboardProject } from "@/lib/projects/queries";
import { PATENT_TYPE_LABELS } from "@/lib/projects/sections";
import { nextStep } from "@/lib/projects/next-step";
import { fmtDate } from "@/lib/format";
import { DeleteProjectButton } from "@/components/dashboard/delete-project-button";

/**
 * Attorney portfolio: a denser table of every matter, grouped by client. Color stays
 * neutral except open findings, which go red when > 0 (the only signal color here).
 */
export function PortfolioTable({
  projects,
  isAdmin,
}: {
  projects: DashboardProject[];
  isAdmin: boolean;
}) {
  const groups = new Map<string, DashboardProject[]>();
  for (const p of projects) {
    const key = p.client_name?.trim() || "Unassigned";
    const arr = groups.get(key) ?? [];
    arr.push(p);
    groups.set(key, arr);
  }
  const clients = [...groups.keys()].sort((a, b) =>
    a === "Unassigned" ? 1 : b === "Unassigned" ? -1 : a.localeCompare(b),
  );

  return (
    <div className="mt-8 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">Matter</th>
            <th className="px-4 py-2 font-medium">Patent</th>
            <th className="px-4 py-2 font-medium">Type</th>
            <th className="px-4 py-2 font-medium">Next step</th>
            <th className="px-4 py-2 text-right font-medium">Complete</th>
            <th className="px-4 py-2 text-right font-medium">Findings</th>
            <th className="px-4 py-2 text-right font-medium">Versions</th>
            <th className="px-4 py-2 text-right font-medium">Last edited</th>
            {isAdmin && <th className="px-4 py-2" aria-label="Remove" />}
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <Fragment key={client}>
              <tr className="border-t border-border bg-secondary/40">
                <td
                  colSpan={isAdmin ? 9 : 8}
                  className="px-4 py-1.5 text-xs font-semibold text-foreground"
                >
                  {client}
                </td>
              </tr>
              {groups.get(client)!.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-border hover:bg-accent/40"
                >
                  <td className="px-4 py-2 text-muted-foreground">
                    {p.matter_no || "—"}
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/projects/${p.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {PATENT_TYPE_LABELS[p.patent_type]}
                  </td>
                  <td
                    className={
                      "px-4 py-2 " +
                      (nextStep(p.declared_status).urgent
                        ? "font-medium text-attention-foreground"
                        : "text-muted-foreground")
                    }
                  >
                    {nextStep(p.declared_status).label}
                  </td>
                  <td className="px-4 py-2 text-right text-foreground">
                    {p.completeness}%
                  </td>
                  <td
                    className={
                      "px-4 py-2 text-right " +
                      (p.openReds > 0
                        ? "font-medium text-violation"
                        : "text-foreground")
                    }
                  >
                    {p.openReds}
                  </td>
                  <td className="px-4 py-2 text-right text-foreground">
                    {p.versionCount}
                  </td>
                  <td className="px-4 py-2 text-right text-muted-foreground">
                    {fmtDate(p.updated_at)}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-2 text-right">
                      <DeleteProjectButton projectId={p.id} name={p.name} />
                    </td>
                  )}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
