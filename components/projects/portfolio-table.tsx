import Link from "next/link";
import type { DashboardProject } from "@/lib/projects/queries";
import { PATENT_TYPE_LABELS } from "@/lib/projects/sections";
import { fmtDate } from "@/lib/format";
import { DeleteProjectButton } from "@/components/dashboard/delete-project-button";

/**
 * Attorney portfolio: one row per matter with the client as its own Company column (not a
 * group header), so it reads as a flat table. Color stays neutral except open issues, which
 * go red when > 0 (the only signal color here).
 */
export function PortfolioTable({
  projects,
  isAdmin,
}: {
  projects: DashboardProject[];
  isAdmin: boolean;
}) {
  const rows = [...projects].sort((a, b) => {
    const ca = a.client_name?.trim() || "Unassigned";
    const cb = b.client_name?.trim() || "Unassigned";
    if (ca !== cb) return ca === "Unassigned" ? 1 : cb === "Unassigned" ? -1 : ca.localeCompare(cb);
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="mt-8 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">Company</th>
            <th className="px-4 py-2 font-medium">Matter</th>
            <th className="px-4 py-2 font-medium">Patent</th>
            <th className="px-4 py-2 font-medium">Type</th>
            <th className="px-4 py-2 font-medium">Next step</th>
            <th className="px-4 py-2 text-right font-medium">Complete</th>
            <th className="px-4 py-2 text-right font-medium">Issues</th>
            <th className="px-4 py-2 text-right font-medium">Versions</th>
            <th className="px-4 py-2 text-right font-medium">Last edited</th>
            {isAdmin && <th className="px-4 py-2" aria-label="Remove" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr
              key={p.id}
              className="border-t border-border outline-1 -outline-offset-1 outline-transparent hover:bg-accent/40 hover:outline hover:outline-border"
            >
              <td className="px-4 py-2 font-medium text-foreground">
                {p.client_name?.trim() || "Unassigned"}
              </td>
              <td className="px-4 py-2 text-muted-foreground">{p.matter_no || "-"}</td>
              <td className="px-4 py-2">
                <Link
                  href={`/projects/${p.id}/overview`}
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
                  (p.next.urgent
                    ? "font-medium text-attention-foreground"
                    : "text-muted-foreground")
                }
              >
                {p.next.label}
              </td>
              <td className="px-4 py-2 text-right text-foreground">{p.completeness}%</td>
              <td
                className={
                  "px-4 py-2 text-right " +
                  (p.openIssues > 0 ? "font-medium text-violation" : "text-foreground")
                }
              >
                {p.openIssues}
              </td>
              <td className="px-4 py-2 text-right text-foreground">{p.versionCount}</td>
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
        </tbody>
      </table>
    </div>
  );
}
