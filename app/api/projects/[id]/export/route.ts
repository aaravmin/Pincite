import { NextResponse } from "next/server";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";
import { buildReportData, toText } from "@/lib/export/report";
import { buildSpecDocx } from "@/lib/export/docx";
import {
  buildAdsText,
  buildDeclarationText,
  buildTransmittalAndFeesText,
  buildReadme,
} from "@/lib/export/filing-package";
import { getProject, getSectionContent } from "@/lib/projects/queries";
import { getInventors, getDeclarations } from "@/lib/filing/queries";
import { logAudit } from "@/lib/audit";
import type { SupabaseClient } from "@supabase/supabase-js";

async function record(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  format: string,
) {
  await supabase
    .from("exports")
    .insert({ user_id: userId, project_id: projectId, format });
  await logAudit(supabase, {
    userId,
    action: "export_generated",
    projectId,
    detail: { format },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const format = new URL(request.url).searchParams.get("format") ?? "txt";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  // The analysis report (the user's own review), kept separate from filing documents.
  if (format === "txt") {
    const report = await buildReportData(id);
    if (!report) return new NextResponse("Not found", { status: 404 });
    await record(supabase, user.id, id, "txt");
    return new NextResponse(toText(report), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="pincite-${id}.txt"`,
      },
    });
  }

  const project = await getProject(id);
  if (!project) return new NextResponse("Not found", { status: 404 });
  const [sections, inventors, declarations] = await Promise.all([
    getSectionContent(id),
    getInventors(id),
    getDeclarations(id),
  ]);
  const title = sections["title"] ?? "";

  // The specification only, as a 37 CFR 1.77 DOCX (the user's main Patent Center upload).
  if (format === "docx") {
    const buf = await buildSpecDocx(sections);
    await record(supabase, user.id, id, "docx");
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="specification-${id}.docx"`,
      },
    });
  }

  // The full filing package: spec DOCX + ADS data + declaration + transmittal/fees + README.
  if (format === "package") {
    const specBuf = await buildSpecDocx(sections);
    const zip = new JSZip();
    zip.file("specification.docx", specBuf);
    zip.file("application-data-sheet.txt", buildAdsText(project, inventors, title));
    zip.file(
      "inventor-declaration.txt",
      buildDeclarationText(project, inventors, declarations, title),
    );
    zip.file("transmittal-and-fees.txt", buildTransmittalAndFeesText(project));
    zip.file("README.txt", buildReadme());
    const zipBuf = await zip.generateAsync({ type: "nodebuffer" });
    await record(supabase, user.id, id, "package");
    return new NextResponse(new Uint8Array(zipBuf), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="pincite-filing-${id}.zip"`,
      },
    });
  }

  return new NextResponse("Unknown format", { status: 400 });
}
