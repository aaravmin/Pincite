/**
 * Export the signed-in user's full audit log as CSV. RLS scopes the rows to this user, so
 * one account can never export another's history.
 */
import { createClient } from "@/lib/supabase/server";

function csvCell(v: unknown): string {
  const s =
    v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: rows, error } = await supabase
    .from("audit_log")
    .select("created_at, action, project_id, detail, ip")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10000);
  if (error) return new Response(error.message, { status: 500 });

  const header = ["created_at", "action", "project_id", "detail", "ip"];
  const lines = [
    header.join(","),
    ...(rows ?? []).map((r) =>
      header.map((h) => csvCell((r as Record<string, unknown>)[h])).join(","),
    ),
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="pincite-audit-log.csv"',
      "Cache-Control": "no-store",
    },
  });
}
