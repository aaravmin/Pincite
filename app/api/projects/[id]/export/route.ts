import { NextResponse } from "next/server";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";
import { buildReportData, toText } from "@/lib/export/report";
import { buildSpecDocx, specToText } from "@/lib/export/docx";
import {
  buildAdsText,
  buildDeclarationText,
  buildTransmittalAndFeesText,
  buildReadme,
} from "@/lib/export/filing-package";
import { getProject, getSectionContent } from "@/lib/projects/queries";
import { getInventors, getDeclarations, getAttachments } from "@/lib/filing/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildFigureSvg, imageSize } from "@/lib/export/figure-svg";
import {
  buildPatentLatex,
  buildLatexReadme,
  figureDescription,
} from "@/lib/export/latex";
import { buildFigurePdf } from "@/lib/export/figure-pdf";
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
  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "txt";
  const isPreview = url.searchParams.get("preview") === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  // A half-screen preview of a file output: build the text representation of the chosen format
  // and return it as JSON. A preview is not a download, so it is not recorded in `exports`.
  if (isPreview) {
    if (format === "txt") {
      const report = await buildReportData(id);
      if (!report) return new NextResponse("Not found", { status: 404 });
      return NextResponse.json({
        title: "Review report",
        filename: `pincite-${id}.txt`,
        language: "text",
        content: toText(report),
      });
    }

    const project = await getProject(id);
    if (!project) return new NextResponse("Not found", { status: 404 });
    const [sections, inventors, declarations, attachments] = await Promise.all([
      getSectionContent(id),
      getInventors(id),
      getDeclarations(id),
      getAttachments(id),
    ]);
    const title = sections["title"] ?? "";

    if (format === "docx") {
      return NextResponse.json({
        title: "Specification (DOCX)",
        filename: `specification-${id}.docx`,
        language: "text",
        note: "A Microsoft Word file in 37 CFR 1.77 order. Download to open it in Word. Below is the text it contains.",
        content: specToText(sections),
      });
    }

    if (format === "latex") {
      const figures: { file: string; label: string; description: string }[] = [];
      let n = 0;
      for (const a of attachments) {
        if (a.kind !== "drawing") continue;
        const ext =
          a.mime === "image/png" ? "png" : a.mime === "image/jpeg" ? "jpg" : null;
        if (!ext) continue;
        n++;
        figures.push({
          file: `figures/figure-${String(n).padStart(2, "0")}.pdf`,
          label: `FIG. ${n}`,
          description: figureDescription(a.view),
        });
      }
      const tex = buildPatentLatex({
        sections,
        title,
        inventors: inventors.map((i) => i.legal_name).filter(Boolean),
        figures,
      });
      return NextResponse.json({
        title: "Patent format (LaTeX)",
        filename: "patent.tex",
        language: "latex",
        note: "The LaTeX source. The download is a .zip with patent.tex plus the figure files; compile it on Overleaf or with pdflatex.",
        content: tex,
        files: ["patent.tex", ...figures.map((f) => f.file), "README.txt"],
      });
    }

    if (format === "package") {
      const drawingFiles = attachments
        .filter((a) => a.kind === "drawing" && a.mime.startsWith("image/"))
        .map((_, i) => `drawings/figure-${String(i + 1).padStart(2, "0")}.svg`);
      const files = [
        "specification.docx",
        "application-data-sheet.txt",
        "inventor-declaration.txt",
        "transmittal-and-fees.txt",
        ...drawingFiles,
        "README.txt",
      ];
      const content = [
        `SPECIFICATION (specification.docx)\n\n${specToText(sections)}`,
        `APPLICATION DATA SHEET (application-data-sheet.txt)\n\n${buildAdsText(project, inventors, title)}`,
        `INVENTOR DECLARATION (inventor-declaration.txt)\n\n${buildDeclarationText(project, inventors, declarations, title)}`,
        `TRANSMITTAL AND FEES (transmittal-and-fees.txt)\n\n${buildTransmittalAndFeesText(project)}`,
        `README (README.txt)\n\n${buildReadme()}`,
      ].join("\n\n\n");
      return NextResponse.json({
        title: "Filing package",
        filename: `pincite-filing-${id}.zip`,
        language: "text",
        note: "Everything in the .zip you would upload to Patent Center. The drawings export as SVG files; the rest is shown below.",
        content,
        files,
      });
    }

    return new NextResponse("Unknown format", { status: 400 });
  }

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

  // Real-patent-format: a LaTeX source bundle (patent.tex + figure files) that typesets the
  // whole application like a published patent. Compiled by the user (Overleaf / pdflatex).
  if (format === "latex") {
    const attachments = await getAttachments(id);
    const admin = createAdminClient();
    const zip = new JSZip();
    const figures: { file: string; label: string; description: string }[] = [];
    let n = 0;
    for (const a of attachments) {
      if (a.kind !== "drawing") continue;
      // pdflatex reads PNG, JPEG, and PDF; skip formats it cannot include.
      const ext =
        a.mime === "image/png" ? "png" : a.mime === "image/jpeg" ? "jpg" : null;
      if (!ext) continue;
      const { data: blob } = await admin.storage
        .from("project-files")
        .download(a.storage_path);
      if (!blob) continue;
      n++;
      // Figures are numbered by sequence in the formal document; the page caption supplies the
      // FIG. label, so the baked image carries only the numerals and lead lines.
      const stem = `figures/figure-${String(n).padStart(2, "0")}`;
      const label = `FIG. ${n}`;
      const description = figureDescription(a.view);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const pdf = await buildFigurePdf({
        bytes,
        mime: a.mime,
        annotations: a.annotations,
        includeFigureLabel: false,
      });
      if (pdf) {
        zip.file(`${stem}.pdf`, pdf);
        figures.push({ file: `${stem}.pdf`, label, description });
      } else {
        zip.file(`${stem}.${ext}`, bytes);
        figures.push({ file: `${stem}.${ext}`, label, description });
      }
    }
    const tex = buildPatentLatex({
      sections,
      title,
      inventors: inventors.map((i) => i.legal_name).filter(Boolean),
      figures,
    });
    zip.file("patent.tex", tex);
    zip.file("README.txt", buildLatexReadme(figures.length));
    const zipBuf = await zip.generateAsync({ type: "nodebuffer" });
    await record(supabase, user.id, id, "latex");
    return new NextResponse(new Uint8Array(zipBuf), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="pincite-patent-latex-${id}.zip"`,
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

    // Drawings: each image figure with its edited annotation layer baked in (numerals, lead
    // lines, figure label) as an SVG, so the package matches what the drawing editor shows.
    // Falls back to the raw bytes when the dimensions can't be read (e.g. WEBP).
    const attachments = await getAttachments(id);
    const figures = attachments.filter(
      (a) => a.kind === "drawing" && a.mime.startsWith("image/"),
    );
    if (figures.length > 0) {
      const admin = createAdminClient();
      let n = 0;
      for (const f of figures) {
        n++;
        const { data: blob } = await admin.storage
          .from("project-files")
          .download(f.storage_path);
        if (!blob) continue;
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const dims = imageSize(bytes);
        const stem = `drawings/figure-${String(n).padStart(2, "0")}`;
        if (dims) {
          const dataUrl = `data:${f.mime};base64,${Buffer.from(bytes).toString("base64")}`;
          zip.file(
            `${stem}.svg`,
            buildFigureSvg({
              width: dims.width,
              height: dims.height,
              imageHref: dataUrl,
              annotations: f.annotations,
            }),
          );
        } else {
          const ext = (f.filename.split(".").pop() || "img").toLowerCase();
          zip.file(`${stem}.${ext}`, bytes);
        }
      }
    }

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
