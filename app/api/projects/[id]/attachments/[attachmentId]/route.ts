import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Redirect to a short-lived signed URL for a private attachment (preview/download).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const { id: projectId, attachmentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: row } = await supabase
    .from("project_attachments")
    .select("storage_path")
    .eq("id", attachmentId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Ownership confirmed via the user client above; sign with the admin client.
  const admin = createAdminClient();
  const { data: signed, error } = await admin.storage
    .from("project-files")
    .createSignedUrl(row.storage_path, 120);
  if (error || !signed) {
    return NextResponse.json(
      { error: error?.message ?? "Could not sign URL" },
      { status: 400 },
    );
  }
  return NextResponse.redirect(signed.signedUrl);
}
