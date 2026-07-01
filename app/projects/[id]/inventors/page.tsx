import { Fragment } from "react";
import { HeaderActions } from "@/components/projects/header-actions";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProject, getSectionContent } from "@/lib/projects/queries";
import { getInventors } from "@/lib/filing/queries";
import { buildAds } from "@/lib/filing/ads";
import { InventorsForm } from "@/components/filing/inventors-form";

export default async function InventorsPage({
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
  const [inventors, sections] = await Promise.all([
    getInventors(id),
    getSectionContent(id),
  ]);
  const ads = buildAds(project, inventors, sections["title"] ?? "");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Inventors &amp; applicant
          </span>
        </div>
        <HeaderActions projectId={id} />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <p className="text-sm text-muted-foreground">
          Application Data Sheet (PTO/AIA/14) data. Pincite checks it for defects before you
          file.
        </p>

        <div className="mt-6">
          <InventorsForm
            projectId={id}
            initialInventors={inventors}
            initialApplicant={{
              applicant_name: project.applicant_name,
              applicant_is_inventor: project.applicant_is_inventor,
              applicant_is_juristic: project.applicant_is_juristic,
              entity_status: project.entity_status,
            }}
          />
        </div>

        <section className="mt-10">
          <h2 className="text-sm font-semibold text-foreground">ADS data card</h2>
          <dl className="mt-3 grid grid-cols-1 gap-y-1 rounded-lg border border-border p-4 text-sm sm:grid-cols-2">
            {ads.rows.map((r) => (
              <Fragment key={r.label}>
                <dt className="text-muted-foreground">{r.label}</dt>
                <dd className="text-foreground sm:text-right">{r.value}</dd>
              </Fragment>
            ))}
          </dl>
          {ads.missing.length > 0 && (
            <div className="mt-3 rounded-md border border-attention bg-attention-bg px-4 py-3 text-sm text-attention-foreground">
              <p className="font-medium">Still needed for a complete ADS</p>
              <ul className="mt-1 list-disc pl-5">
                {ads.missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
