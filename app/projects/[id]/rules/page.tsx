import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProject, getSectionContent } from "@/lib/projects/queries";
import { surfaceRules, type SurfacedRule } from "@/lib/rules/surface";
import { validateCitations } from "@/lib/mpep/citation";
import { RulesClient } from "@/components/rules/rules-client";

export default async function RulesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("consented_at")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.consented_at) redirect("/consent");

  const project = await getProject(id);
  if (!project) notFound();
  const sections = await getSectionContent(id);
  const filled = Object.entries(sections)
    .filter(([, v]) => v.trim().length > 0)
    .map(([k]) => k);

  const { appliesNow, conditional } = surfaceRules({
    patentType: project.patent_type,
    filled,
    sections,
    declared_status: project.declared_status,
  });

  // Drop MPEP pins that don't resolve to corpus text (anti-hallucination spine).
  const pins = [...appliesNow, ...conditional]
    .map((r) => r.mpep_section)
    .filter((p): p is string => !!p);
  const ok = await validateCitations(pins);
  const clean = <T extends SurfacedRule>(arr: T[]): T[] =>
    arr.map((r) =>
      r.mpep_section && !ok.has(r.mpep_section) ? { ...r, mpep_section: null } : r,
    );

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← {project.name}
          </Link>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Rules
          </span>
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <RulesClient appliesNow={clean(appliesNow)} conditional={clean(conditional)} />
      </div>
    </div>
  );
}
