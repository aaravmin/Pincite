import { NextResponse } from "next/server";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";
import { buildReportData, toText } from "@/lib/export/report";
import { buildSpecDocx } from "@/lib/export/docx";
import { buildPatentPdf } from "@/lib/export/patent-pdf";
import {
  buildAdsText,
  buildDeclarationText,
  buildTransmittalAndFeesText,
  buildReadme,
} from "@/lib/export/filing-package";
import { getProject, getSectionContent } from "@/lib/projects/queries";
import { getInventors, getAttachments } from "@/lib/filing/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildFigureSvg, imageSize } from "@/lib/export/figure-svg";
import { buildSceneSvg } from "@/lib/export/scene-svg";
import {
  buildPatentLatex,
  buildLatexReadme,
  figureDescription,
} from "@/lib/export/latex";
import { buildFigurePdf } from "@/lib/export/figure-pdf";
import { logAudit } from "@/lib/audit";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Safe, collision-free names for the signed declaration documents placed under `declarations/`
 * in the filing package. Sanitizes each filename and de-duplicates so two inventors who both
 * upload "signed-declaration.pdf" don't overwrite each other in the zip.
 */
function declarationZipNames(filenames: string[]): string[] {
  const used = new Set<string>();
  return filenames.map((raw, i) => {
    const fallback = `declaration-${i + 1}.pdf`;
    const safe =
      (raw || fallback).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || fallback;
    let candidate = safe;
    let n = 1;
    while (used.has(candidate.toLowerCase())) {
      const dot = safe.lastIndexOf(".");
      candidate =
        dot > 0 ? `${safe.slice(0, dot)}-${n}${safe.slice(dot)}` : `${safe}-${n}`;
      n++;
    }
    used.add(candidate.toLowerCase());
    return candidate;
  });
}

/**
 * Render the application as a typeset patent PDF (lib/export/patent-pdf), with each uploaded
 * drawing baked into a figure PDF (numerals + lead lines) and embedded on its own page. This is
 * the visual output shown in the half-screen preview and downloaded as the PDF format; it is
 * what the LaTeX bundle looks like compiled. Returns null if the matter does not exist.
 */
async function renderPatentPdf(id: string): Promise<Uint8Array | null> {
  const project = await getProject(id);
  if (!project) return null;
  const [sections, inventors, attachments] = await Promise.all([
    getSectionContent(id),
    getInventors(id),
    getAttachments(id),
  ]);
  const title = sections["title"] ?? "";
  const admin = createAdminClient();
  const figures: { pdf: Uint8Array; label: string; description: string }[] = [];
  let n = 0;
  for (const a of attachments) {
    if (a.kind !== "drawing") continue;
    if (a.mime !== "image/png" && a.mime !== "image/jpeg") continue;
    const { data: blob } = await admin.storage
      .from("project-files")
      .download(a.storage_path);
    if (!blob) continue;
    n++;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const pdf = await buildFigurePdf({
      bytes,
      mime: a.mime,
      annotations: a.annotations,
      includeFigureLabel: false,
    });
    if (pdf) {
      figures.push({ pdf, label: `FIG. ${n}`, description: figureDescription(a.view) });
    }
  }
  return buildPatentPdf({
    sections,
    title,
    inventors: inventors.map((i) => i.legal_name).filter(Boolean),
    figures,
  });
}

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

  // A half-screen preview shows what the application looks like typeset: the rendered patent PDF,
  // streamed inline so the browser displays the actual pages. Every previewable format (PDF,
  // LaTeX, filing package) previews this same document. A preview is not a download, so it is
  // not recorded in `exports`.
  if (isPreview) {
    const pdfBytes = await renderPatentPdf(id);
    if (!pdfBytes) return new NextResponse("Not found", { status: 404 });
    return new NextResponse(new Uint8Array(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="patent-${id}.pdf"`,
      },
    });
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

  // The typeset patent PDF: what the LaTeX bundle looks like compiled, ready to read or file.
  if (format === "pdf") {
    const pdfBytes = await renderPatentPdf(id);
    if (!pdfBytes) return new NextResponse("Not found", { status: 404 });
    await record(supabase, user.id, id, "pdf");
    return new NextResponse(new Uint8Array(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="patent-${id}.pdf"`,
      },
    });
  }

  const project = await getProject(id);
  if (!project) return new NextResponse("Not found", { status: 404 });
  const [sections, inventors] = await Promise.all([
    getSectionContent(id),
    getInventors(id),
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
    const attachments = await getAttachments(id);
    const admin = createAdminClient();
    const zip = new JSZip();
    zip.file("specification.docx", specBuf);
    zip.file("application-data-sheet.txt", buildAdsText(project, inventors, title));

    // The signed inventor declarations: the operative wet-/hand-signed documents the inventors
    // uploaded, bundled verbatim under declarations/ so the package is what actually gets filed.
    const declarationDocs = attachments.filter((a) => a.kind === "declaration");
    const declNames = declarationZipNames(declarationDocs.map((a) => a.filename));
    for (const [i, doc] of declarationDocs.entries()) {
      const { data: blob } = await admin.storage
        .from("project-files")
        .download(doc.storage_path);
      if (!blob) continue;
      zip.file(`declarations/${declNames[i]}`, new Uint8Array(await blob.arrayBuffer()));
    }
    zip.file(
      "inventor-declaration.txt",
      buildDeclarationText(inventors, declNames, title),
    );
    zip.file("transmittal-and-fees.txt", buildTransmittalAndFeesText(project));

    // Drawings, in order. A figure the user has vectorized is filed as its EDITED vector scene
    // (the drawing of record); this is what carries edits into the filed output and lets a
    // vectorized PDF into the package. An un-vectorized image falls back to the raster with its
    // annotation layer baked in; a raw PDF (which can't be embedded here) is skipped.
    const figures = attachments.filter(
      (a) => a.kind === "drawing" && (a.vector_scene_meta || a.mime.startsWith("image/")),
    );
    if (figures.length > 0) {
      let n = 0;
      for (const f of figures) {
        n++;
        const stem = `drawings/figure-${String(n).padStart(2, "0")}`;
        if (f.vector_scene_meta) {
          const { data: sceneBlob } = await admin.storage
            .from("project-files")
            .download(f.vector_scene_meta.storagePath);
          if (!sceneBlob) continue;
          zip.file(`${stem}.svg`, buildSceneSvg(JSON.parse(await sceneBlob.text())));
          continue;
        }
        const { data: blob } = await admin.storage
          .from("project-files")
          .download(f.storage_path);
        if (!blob) continue;
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const dims = imageSize(bytes);
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
