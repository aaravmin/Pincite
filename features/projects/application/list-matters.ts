import "server-only";

/**
 * The matter list behind the command palette. It reuses the RLS-scoped dashboard load, so it
 * can only ever return the signed-in user's own matters.
 */
import { getDashboard } from "@/features/projects/application/get-dashboard";

export async function listMatters(): Promise<{ id: string; name: string }[]> {
  const projects = await getDashboard();
  return projects.map((p) => ({ id: p.id, name: p.name }));
}
