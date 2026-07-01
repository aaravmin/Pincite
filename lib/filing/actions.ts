"use server";

/**
 * Filing-domain mutations: inventors (ADS), applicant/entity, and attachment deletes.
 * Each enforces auth (RLS is the real boundary) and records an audit row. Attachment
 * UPLOADS go through the route handler app/api/projects/[id]/attachments (multipart).
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  analyzeDrawingVision,
  classifyDrawingView,
  type DrawingVision,
} from "@/lib/llm/vision";
import { checkRateLimit, checkGlobalLimit } from "@/lib/ratelimit";
import { logAudit } from "@/lib/audit";
import { validateCitations } from "@/lib/mpep/citation";
import { getProject, getSectionContent } from "@/lib/projects/queries";
import { ENTITY_STATUSES, type EntityStatus } from "@/lib/projects/sections";
import {
  ATTACHMENT_VIEWS,
  type InventorInput,
  type DrawingFinding,
  type DrawingReview,
  type DrawingAnnotations,
  type VectorObject,
  type VectorScene,
  type VectorSceneMeta,
} from "@/lib/filing/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function saveInventors(input: {
  projectId: string;
  inventors: InventorInput[];
}): Promise<{ ok: true } | { error: string }> {
  const { supabase, user } = await requireUser();
  const clean = input.inventors
    .map((i) => ({
      legal_name: i.legal_name?.trim() ?? "",
      residence: i.residence?.trim() ?? "",
      mailing_address: i.mailing_address?.trim() ?? "",
      citizenship: i.citizenship?.trim() ?? "",
    }))
    .filter(
      (i) =>
        i.legal_name || i.residence || i.mailing_address || i.citizenship,
    );

  // Replace-all: delete the existing set, insert the new ordered rows.
  const { error: delErr } = await supabase
    .from("project_inventors")
    .delete()
    .eq("project_id", input.projectId);
  if (delErr) return { error: delErr.message };

  if (clean.length > 0) {
    const rows = clean.map((i, idx) => ({
      ...i,
      project_id: input.projectId,
      ord: idx,
    }));
    const { error: insErr } = await supabase
      .from("project_inventors")
      .insert(rows);
    if (insErr) return { error: insErr.message };
  }

  await logAudit(supabase, {
    userId: user.id,
    action: "inventors_saved",
    projectId: input.projectId,
    detail: { count: clean.length },
  });
  revalidatePath(`/projects/${input.projectId}/inventors`);
  return { ok: true };
}

export async function saveApplicant(input: {
  projectId: string;
  applicantName: string;
  applicantIsInventor: boolean;
  applicantIsJuristic: boolean;
  entityStatus: EntityStatus;
}): Promise<{ ok: true } | { error: string }> {
  const { supabase, user } = await requireUser();
  const entity = ENTITY_STATUSES.includes(input.entityStatus)
    ? input.entityStatus
    : "large";
  const { error } = await supabase
    .from("projects")
    .update({
      applicant_name: input.applicantName?.trim() || null,
      applicant_is_inventor: input.applicantIsInventor,
      applicant_is_juristic: input.applicantIsJuristic,
      entity_status: entity,
    })
    .eq("id", input.projectId);
  if (error) return { error: error.message };

  await logAudit(supabase, {
    userId: user.id,
    action: "applicant_saved",
    projectId: input.projectId,
    detail: { entity_status: entity, juristic: input.applicantIsJuristic },
  });
  revalidatePath(`/projects/${input.projectId}/inventors`);
  return { ok: true };
}

export async function deleteAttachment(input: {
  projectId: string;
  attachmentId: string;
}): Promise<{ ok: true } | { error: string }> {
  const { supabase, user } = await requireUser();
  const { data: row } = await supabase
    .from("project_attachments")
    .select("storage_path")
    .eq("id", input.attachmentId)
    .eq("project_id", input.projectId)
    .maybeSingle();
  if (!row) return { error: "Attachment not found." };

  // Ownership confirmed via the user client above; do Storage work with the admin client.
  const admin = createAdminClient();
  // The per-page rows of a multi-page PDF share one storage object; only remove the bytes when
  // this is the last row referencing them, so deleting one page doesn't wipe the others.
  const { count: siblings } = await supabase
    .from("project_attachments")
    .select("id", { count: "exact", head: true })
    .eq("project_id", input.projectId)
    .eq("storage_path", row.storage_path)
    .neq("id", input.attachmentId);
  const toRemove = [`${input.projectId}/scenes/${input.attachmentId}.json`];
  if (!siblings) toRemove.push(row.storage_path);
  await admin.storage.from("project-files").remove(toRemove);

  const { error } = await supabase
    .from("project_attachments")
    .delete()
    .eq("id", input.attachmentId);
  if (error) return { error: error.message };

  await logAudit(supabase, {
    userId: user.id,
    action: "attachment_deleted",
    projectId: input.projectId,
  });
  revalidatePath(`/projects/${input.projectId}/uploads`);
  return { ok: true };
}

/**
 * Review an uploaded figure with a vision model for drawing-compliance defects under 37 CFR
 * 1.84 and 1.83: describe it, check each disclosed component appears, flag reference numerals
 * that are in the drawing but not the specification, flag a missing figure label, and pass
 * through any problems the model can see - each with an approximate location for an on-figure
 * red circle. Public or synthetic figures only until vendor ZDR is on.
 */
export async function analyzeDrawing(input: {
  projectId: string;
  attachmentId: string;
}): Promise<({ ok: true } & DrawingReview) | { error: string }> {
  const { supabase, user } = await requireUser();

  const { data: att } = await supabase
    .from("project_attachments")
    .select("storage_path, mime, annotations")
    .eq("id", input.attachmentId)
    .eq("project_id", input.projectId)
    .maybeSingle();
  if (!att) return { error: "Attachment not found." };
  if (!att.mime.startsWith("image/")) {
    return { error: "Only image figures can be reviewed." };
  }

  const rl = await checkRateLimit(supabase, "drawing_vision", 30, 3600);
  if (!rl.allowed) return { error: rl.retryMessage };
  const budget = await checkGlobalLimit(supabase, "grok_global_day", 300, 86400);
  if (!budget.allowed)
    return { error: "The daily AI budget for figure analysis is used up. Please try again tomorrow." };

  const { data: blob, error: dlErr } = await createAdminClient()
    .storage.from("project-files")
    .download(att.storage_path);
  if (dlErr || !blob) {
    return { error: dlErr?.message ?? "Could not read the file." };
  }
  const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");

  let vision: DrawingVision;
  try {
    vision = await analyzeDrawingVision(base64, att.mime);
  } catch (e) {
    return { error: `Vision model error: ${(e as Error).message}` };
  }
  if (!vision.summary && vision.numerals.length === 0 && vision.issues.length === 0) {
    return { error: "The vision model returned nothing usable for this figure." };
  }

  // Component presence (37 CFR 1.83): each disclosed component should appear in the figure.
  const { data: disc } = await supabase
    .from("project_disclosure")
    .select("components")
    .eq("project_id", input.projectId)
    .maybeSingle();
  const haystack = vision.summary.toLowerCase();
  const components = ((disc?.components as string) ?? "")
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3)
    .map((name) => {
      const term = name.toLowerCase().replace(/^(a|an|the)\s+/, "");
      const words = term.split(/\s+/);
      const probe = words[words.length - 1];
      const shown =
        probe.length >= 3 && (haystack.includes(probe) || haystack.includes(term));
      return { name, shown };
    });

  // Patent type selects the governing MPEP for drawings (design vs utility). Pins are
  // corpus-validated; an unresolved one is dropped to null but the finding still shows.
  const project = await getProject(input.projectId);
  const generalMpep = project?.patent_type === "design" ? "1503.02" : "608.02";
  const numeralMpep = "608.01(g)";
  const resolved = await validateCitations([generalMpep, numeralMpep]);
  const pin = (nbr: string) => (resolved.has(nbr) ? nbr : null);

  const findings: DrawingFinding[] = [];

  for (const [i, iss] of vision.issues.entries()) {
    findings.push({
      id: `issue-${i}`,
      title: iss.title || "Drawing issue",
      detail: iss.detail,
      cfr: "37 CFR 1.84",
      mpep: pin(generalMpep),
      x: iss.x,
      y: iss.y,
    });
  }

  if (!vision.figureLabel) {
    findings.push({
      id: "figlabel",
      title: "No figure label detected",
      detail:
        "No label such as FIG. 1 was found. Each view must be numbered (37 CFR 1.84(u)).",
      cfr: "37 CFR 1.84(u)",
      mpep: pin(generalMpep),
      x: null,
      y: null,
    });
  }

  // Reference numerals that appear in the drawing but never in the specification text.
  const sections = await getSectionContent(input.projectId);
  const specText = (
    (sections["detailed_description"] ?? "") +
    " " +
    (sections["drawings_meta"] ?? "") +
    " " +
    (sections["summary"] ?? "")
  ).toLowerCase();
  const inSpec = (numeral: string): boolean => {
    const esc = numeral.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`).test(specText);
  };
  const seenNumerals = new Set<string>();
  let nIdx = 0;
  for (const num of vision.numerals) {
    const key = num.numeral.toLowerCase();
    if (seenNumerals.has(key)) continue;
    seenNumerals.add(key);
    if (inSpec(num.numeral)) continue;
    findings.push({
      id: `numeral-${nIdx++}`,
      title: `Reference numeral ${num.numeral} not described`,
      detail: `Numeral ${num.numeral} appears in the drawing but is not mentioned in your draft (37 CFR 1.84(p)).`,
      cfr: "37 CFR 1.84(p)",
      mpep: pin(numeralMpep),
      x: num.x,
      y: num.y,
    });
  }

  const review: DrawingReview = {
    summary: vision.summary,
    figureLabel: vision.figureLabel,
    components,
    findings,
  };
  // Persist the review so the issues flagged on this figure survive a page leave. Ownership
  // was verified above; use the admin client because project_attachments has no row-update
  // RLS policy. Seed the editable annotation layer from the detected numerals the first time,
  // so the drawing editor opens with movable labels in place; never clobber saved edits.
  const update: { analysis: DrawingReview; annotations?: DrawingAnnotations } = {
    analysis: review,
  };
  if (att.annotations == null) {
    update.annotations = {
      labels: vision.numerals.map((n, i) => ({
        id: `n${i}`,
        text: n.numeral,
        x: n.x,
        y: n.y,
        lead: null,
      })),
      figureLabel: null,
    };
  }
  await createAdminClient()
    .from("project_attachments")
    .update(update)
    .eq("id", input.attachmentId)
    .eq("project_id", input.projectId);

  await logAudit(supabase, {
    userId: user.id,
    action: "drawing_analyzed",
    projectId: input.projectId,
    detail: {
      attachmentId: input.attachmentId,
      findings: findings.length,
      numerals: vision.numerals.length,
    },
  });

  return { ok: true, ...review };
}

/**
 * Auto-detect the standard view (top, front, perspective, ...) of an uploaded image figure
 * with the vision model and store it as the attachment's `view`, so figures get labeled
 * without the user picking from a dropdown. Best-effort: a low-confidence read or a rate
 * limit leaves the view unset rather than guessing. Public/synthetic figures only.
 */
export async function classifyOrientation(input: {
  projectId: string;
  attachmentId: string;
}): Promise<{ ok: true; view: string } | { error: string }> {
  const { supabase, user } = await requireUser();

  const { data: att } = await supabase
    .from("project_attachments")
    .select("storage_path, mime")
    .eq("id", input.attachmentId)
    .eq("project_id", input.projectId)
    .maybeSingle();
  if (!att) return { error: "Attachment not found." };
  if (!att.mime.startsWith("image/")) {
    return { error: "Only image figures can be classified." };
  }

  const rl = await checkRateLimit(supabase, "drawing_classify", 60, 3600);
  if (!rl.allowed) return { error: rl.retryMessage };

  const { data: blob, error: dlErr } = await createAdminClient()
    .storage.from("project-files")
    .download(att.storage_path);
  if (dlErr || !blob) return { error: dlErr?.message ?? "Could not read the file." };
  const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");

  let result: { view: string; confidence: number };
  try {
    result = await classifyDrawingView(base64, att.mime);
  } catch (e) {
    return { error: `Vision model error: ${(e as Error).message}` };
  }

  // Only assign on a confident read; otherwise leave it blank for the user to set.
  const view =
    result.view &&
    result.confidence >= 0.45 &&
    (ATTACHMENT_VIEWS as readonly string[]).includes(result.view)
      ? result.view
      : "";
  if (!view) return { ok: true, view: "" };

  // Ownership verified above; project_attachments has no row-update RLS policy, so write
  // with the admin client (same as the analysis persist above).
  await createAdminClient()
    .from("project_attachments")
    .update({ view })
    .eq("id", input.attachmentId)
    .eq("project_id", input.projectId);

  await logAudit(supabase, {
    userId: user.id,
    action: "drawing_oriented",
    projectId: input.projectId,
    detail: {
      attachmentId: input.attachmentId,
      view,
      confidence: result.confidence,
    },
  });

  return { ok: true, view };
}

/** Manually set (or clear) a figure's view, to correct an auto-detected label. */
export async function setAttachmentView(input: {
  projectId: string;
  attachmentId: string;
  view: string;
}): Promise<{ ok: true } | { error: string }> {
  const { supabase, user } = await requireUser();
  const view = (ATTACHMENT_VIEWS as readonly string[]).includes(input.view)
    ? input.view
    : "";

  const { data: att } = await supabase
    .from("project_attachments")
    .select("id")
    .eq("id", input.attachmentId)
    .eq("project_id", input.projectId)
    .maybeSingle();
  if (!att) return { error: "Attachment not found." };

  await createAdminClient()
    .from("project_attachments")
    .update({ view: view || null })
    .eq("id", input.attachmentId)
    .eq("project_id", input.projectId);

  await logAudit(supabase, {
    userId: user.id,
    action: "drawing_oriented",
    projectId: input.projectId,
    detail: { attachmentId: input.attachmentId, view, manual: true },
  });

  return { ok: true };
}

/** Persist the editable label/lead-line layer for a figure (the drawing editor, Feature 2). */
export async function saveDrawingAnnotations(input: {
  projectId: string;
  attachmentId: string;
  annotations: DrawingAnnotations;
}): Promise<{ ok: true } | { error: string }> {
  const { supabase, user } = await requireUser();

  const { data: att } = await supabase
    .from("project_attachments")
    .select("id")
    .eq("id", input.attachmentId)
    .eq("project_id", input.projectId)
    .maybeSingle();
  if (!att) return { error: "Attachment not found." };

  // Normalize/clamp the incoming layer so stored coordinates are always 0..1.
  const clamp = (n: number) => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));
  const labels = (input.annotations?.labels ?? []).slice(0, 200).map((l, i) => ({
    id: String(l.id ?? `l${i}`),
    text: String(l.text ?? "").slice(0, 40),
    x: clamp(l.x),
    y: clamp(l.y),
    lead: l.lead ? { x: clamp(l.lead.x), y: clamp(l.lead.y) } : null,
  }));
  const fl = input.annotations?.figureLabel;
  const figureLabel =
    fl && String(fl.text ?? "").trim()
      ? { text: String(fl.text).slice(0, 40), x: clamp(fl.x), y: clamp(fl.y) }
      : null;
  const annotations: DrawingAnnotations = { labels, figureLabel };

  await createAdminClient()
    .from("project_attachments")
    .update({ annotations })
    .eq("id", input.attachmentId)
    .eq("project_id", input.projectId);

  await logAudit(supabase, {
    userId: user.id,
    action: "drawing_edited",
    projectId: input.projectId,
    detail: { attachmentId: input.attachmentId, labels: labels.length },
  });

  return { ok: true };
}

/**
 * Vectorize a drawing into an editable scene: decode -> binarize -> trace each ink island into a
 * movable/resizable/hideable path object. The scene body (potentially MBs of path data) is written
 * to Storage at {projectId}/scenes/{attachmentId}.json and only a small pointer is stored on the
 * row, so list queries stay light. Deterministic and AI-free, so it carries a soft per-user CPU
 * cap only, no model budget. A figure the user has already hand-edited is left untouched so a
 * re-run never clobbers their work.
 */
export async function seedVectorScene(input: {
  projectId: string;
  attachmentId: string;
}): Promise<{ ok: true; meta: VectorSceneMeta } | { error: string }> {
  const { supabase, user } = await requireUser();

  const { data: att } = await supabase
    .from("project_attachments")
    .select("storage_path, mime, vector_scene_meta, page_index")
    .eq("id", input.attachmentId)
    .eq("project_id", input.projectId)
    .maybeSingle();
  if (!att) return { error: "Attachment not found." };

  const existing = att.vector_scene_meta as VectorSceneMeta | null;
  if (existing?.edited) return { ok: true, meta: existing };
  const isPdf = att.mime === "application/pdf";
  if (!isPdf && !att.mime.startsWith("image/")) {
    return { error: "This file type can't be vectorized." };
  }

  const rl = await checkRateLimit(supabase, "drawing_vectorize", 60, 3600);
  if (!rl.allowed) return { error: rl.retryMessage };

  const admin = createAdminClient();
  const { data: blob, error: dlErr } = await admin.storage
    .from("project-files")
    .download(att.storage_path);
  if (dlErr || !blob) return { error: dlErr?.message ?? "Could not read the file." };
  const bytes = new Uint8Array(await blob.arrayBuffer());

  const tracedAt = new Date().toISOString();
  let scene: VectorScene;
  try {
    // Dynamic import so the native canvas / pdf renderer loads only when a drawing is vectorized.
    const { buildSceneFromImage, buildSceneFromPdf } = await import("@/lib/vector/scene");
    ({ scene } = isPdf
      ? await buildSceneFromPdf(bytes, tracedAt, att.page_index ?? 0)
      : await buildSceneFromImage(bytes, tracedAt));
  } catch (e) {
    return { error: `Could not vectorize the drawing: ${(e as Error).message}` };
  }
  if (scene.objects.length === 0) {
    return { error: "No drawn lines were found to vectorize in this figure." };
  }

  const storagePath = `${input.projectId}/scenes/${input.attachmentId}.json`;
  const { error: upErr } = await admin.storage
    .from("project-files")
    .upload(storagePath, Buffer.from(JSON.stringify(scene)), {
      contentType: "application/json",
      upsert: true,
    });
  if (upErr) return { error: upErr.message };

  const meta: VectorSceneMeta = {
    version: 1,
    storagePath,
    width: scene.width,
    height: scene.height,
    objectCount: scene.objects.length,
    edited: false,
    tracedAt,
  };
  await admin
    .from("project_attachments")
    .update({ vector_scene_meta: meta })
    .eq("id", input.attachmentId)
    .eq("project_id", input.projectId);

  await logAudit(supabase, {
    userId: user.id,
    action: "drawing_vectorized",
    projectId: input.projectId,
    detail: { attachmentId: input.attachmentId, objects: scene.objects.length },
  });

  return { ok: true, meta };
}

/**
 * Persist an edited vector scene back to Storage. Sanitizes the incoming objects (object cap,
 * finite transforms, black-only fills/strokes, bounded path length) and flips `edited` so a later
 * re-vectorize won't overwrite the user's work. Canvas dimensions are pinned to the original trace.
 */
export async function saveVectorScene(input: {
  projectId: string;
  attachmentId: string;
  scene: VectorScene;
}): Promise<{ ok: true; meta: VectorSceneMeta } | { error: string }> {
  const { supabase, user } = await requireUser();

  const { data: att } = await supabase
    .from("project_attachments")
    .select("vector_scene_meta")
    .eq("id", input.attachmentId)
    .eq("project_id", input.projectId)
    .maybeSingle();
  if (!att) return { error: "Attachment not found." };
  const existing = att.vector_scene_meta as VectorSceneMeta | null;
  if (!existing) return { error: "This figure has not been vectorized yet." };

  const scene = sanitizeScene(input.scene, existing);

  const { error: upErr } = await createAdminClient()
    .storage.from("project-files")
    .upload(existing.storagePath, Buffer.from(JSON.stringify(scene)), {
      contentType: "application/json",
      upsert: true,
    });
  if (upErr) return { error: upErr.message };

  const meta: VectorSceneMeta = {
    ...existing,
    width: scene.width,
    height: scene.height,
    objectCount: scene.objects.length,
    edited: true,
  };
  await createAdminClient()
    .from("project_attachments")
    .update({ vector_scene_meta: meta })
    .eq("id", input.attachmentId)
    .eq("project_id", input.projectId);

  await logAudit(supabase, {
    userId: user.id,
    action: "drawing_scene_saved",
    projectId: input.projectId,
    detail: { attachmentId: input.attachmentId, objects: scene.objects.length },
  });

  return { ok: true, meta };
}

const MAX_SCENE_OBJECTS = 8000;
// A single connected outline can legitimately be ~200k chars; only drop truly pathological
// paths, and never slice (slicing mid-number produces an invalid `d`).
const MAX_PATH_CHARS = 2_000_000;

/** Coerce a client-sent scene into a safe, well-formed VectorScene before it is stored. */
function sanitizeScene(scene: VectorScene, meta: VectorSceneMeta): VectorScene {
  const fin = (n: unknown, fallback: number) =>
    typeof n === "number" && Number.isFinite(n) ? n : fallback;
  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
  // Canvas dimensions are fixed by the original trace; never trust the client to change them.
  const width = meta.width;
  const height = meta.height;

  const objects: VectorObject[] = (Array.isArray(scene?.objects) ? scene.objects : [])
    .slice(0, MAX_SCENE_OBJECTS)
    .map((o, i): VectorObject | null => {
      const d = typeof o?.d === "string" ? o.d : "";
      if (!d || d.length > MAX_PATH_CHARS) return null;
      const t = o?.transform ?? {};
      const b = o?.bbox ?? {};
      const stroke =
        o?.stroke && typeof o.stroke === "object"
          ? { color: "#000000" as const, width: clamp(fin(o.stroke.width, 1), 0.2, 50) }
          : null;
      return {
        id: String(o?.id ?? `o${i}`).slice(0, 40),
        d,
        bbox: {
          x: fin(b.x, 0),
          y: fin(b.y, 0),
          w: Math.max(1, fin(b.w, 1)),
          h: Math.max(1, fin(b.h, 1)),
        },
        transform: {
          tx: clamp(fin(t.tx, 0), -4 * width, 4 * width),
          ty: clamp(fin(t.ty, 0), -4 * height, 4 * height),
          sx: clamp(fin(t.sx, 1), 0.01, 100),
          sy: clamp(fin(t.sy, 1), 0.01, 100),
          rot: clamp(fin(t.rot, 0), -360, 360),
        },
        hidden: Boolean(o?.hidden),
        z: fin(o?.z, i),
        source: o?.source === "user" ? "user" : "trace",
        fill: o?.fill === "none" ? "none" : "#000000",
        stroke,
      };
    })
    .filter((o): o is VectorObject => o !== null);

  return {
    version: 1,
    width,
    height,
    objects,
    source: scene?.source ?? { kind: "image", pageIndex: 0, tracedAt: meta.tracedAt },
  };
}
