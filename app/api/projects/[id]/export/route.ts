import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildReportData, toText } from "@/lib/export/report";
import { logAudit } from "@/lib/audit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const format = new URL(request.url).searchParams.get("format") ?? "txt";
  if (format !== "txt") {
    return new NextResponse("Only txt is supported here; use Print to PDF.", {
      status: 400,
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const report = await buildReportData(id);
  if (!report) return new NextResponse("Not found", { status: 404 });

  const text = toText(report);
  await supabase
    .from("exports")
    .insert({ user_id: user.id, project_id: id, format: "txt" });
  await logAudit(supabase, {
    userId: user.id,
    action: "export_generated",
    projectId: id,
    detail: { format: "txt" },
  });

  return new NextResponse(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="pincite-${id}.txt"`,
    },
  });
}
