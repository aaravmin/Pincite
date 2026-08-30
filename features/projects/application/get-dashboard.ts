import "server-only";

/**
 * The dashboard model: one batched load (never one query per project) plus a pure summary
 * per row. Splitting it this way is what keeps the issue count, completeness, stage, and
 * next step unit-testable without Supabase.
 */
import { requireViewer } from "@/shared/auth/require-viewer";
import { loadDashboardRows } from "@/features/projects/infrastructure/dashboard-repository";
import {
  summarizeDashboardProject,
  type DashboardProject,
} from "@/features/projects/domain/dashboard-summary";

export type GetDashboardDeps = {
  requireViewer: typeof requireViewer;
  loadDashboardRows: typeof loadDashboardRows;
};

const defaultDeps: GetDashboardDeps = { requireViewer, loadDashboardRows };

export async function getDashboard(
  deps: GetDashboardDeps = defaultDeps,
): Promise<DashboardProject[]> {
  const { supabase } = await deps.requireViewer();
  const rows = await deps.loadDashboardRows(supabase);
  return rows.map(summarizeDashboardProject);
}
