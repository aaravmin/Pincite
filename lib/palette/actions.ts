"use server";

// Lightweight matter list for the command palette. Reuses the RLS-scoped
// dashboard query, so it only ever returns the signed-in user's own matters.

import { getDashboardProjects } from "@/lib/projects/queries";

export async function listMatters(): Promise<{ id: string; name: string }[]> {
  const projects = await getDashboardProjects();
  return projects.map((p) => ({ id: p.id, name: p.name }));
}
