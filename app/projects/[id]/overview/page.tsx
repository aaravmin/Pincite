import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { HeaderActions } from "@/components/projects/header-actions";
import { createClient } from "@/lib/supabase/server";
import { getReadiness, type Gate } from "@/lib/readiness";
import type { UserRole } from "@/lib/profile";

export default async function OverviewPage({
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
    .select("consented_at, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.consented_at) redirect("/consent");

  const r = await getReadiness(id, (profile.role as UserRole | null) ?? null);
  if (!r) notFound();

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight text-foreground">
            {r.project.name}
          </span>
        </div>
        <HeaderActions projectId={id} />
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <div className="rounded-lg border border-border p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Where this stands
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                {r.stage.label}
              </h1>
              {r.stage.signals[0] && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {r.stage.signals[0]}
                </p>
              )}
            </div>
            {r.next && (
              <Link
                href={r.next.href}
                className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
              >
                Next step {r.next.label} →
              </Link>
            )}
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Completeness</span>
              <span>{r.completeness}%</span>
            </div>
            <div
              className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-valuenow={r.completeness}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-foreground"
                style={{ width: `${r.completeness}%` }}
              />
            </div>
          </div>

          {r.stage.missing.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-foreground">To advance</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
                {r.stage.missing.slice(0, 4).map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <p className="mt-6 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Checklist
        </p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {r.gates.map((gate) => (
            <GateCard key={gate.key} gate={gate} />
          ))}
        </div>
      </main>
    </div>
  );
}

function GateCard({ gate }: { gate: Gate }) {
  const detailClass =
    gate.status === "violation"
      ? "text-violation"
      : gate.status === "attention"
        ? "text-attention-foreground"
        : gate.status === "done"
          ? "text-pass"
          : "text-muted-foreground";
  const word =
    gate.status === "done"
      ? "Done"
      : gate.status === "violation"
        ? "Action needed"
        : gate.status === "attention"
          ? "Review"
          : "To do";

  return (
    <Link
      href={gate.href}
      data-status={gate.status}
      className="flex items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-accent/40"
    >
      <Marker status={gate.status} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{gate.label}</p>
        <p className={"text-xs " + detailClass}>
          <span className="sr-only">{word}. </span>
          {gate.detail}
        </p>
      </div>
    </Link>
  );
}

function Marker({ status }: { status: Gate["status"] }) {
  if (status === "done") {
    return (
      <span
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-pass text-[11px] font-semibold text-pass-foreground"
        aria-hidden
      >
        ✓
      </span>
    );
  }
  if (status === "violation") {
    return (
      <span
        className="mt-1 size-3 shrink-0 rounded-full bg-violation"
        aria-hidden
      />
    );
  }
  if (status === "attention") {
    return (
      <span
        className="mt-1 size-3 shrink-0 rounded-full border-2 border-attention"
        aria-hidden
      />
    );
  }
  return (
    <span
      className="mt-1 size-3 shrink-0 rounded-full border border-muted-foreground/50"
      aria-hidden
    />
  );
}
