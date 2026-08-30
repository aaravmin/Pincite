import { NextResponse } from "next/server";
import { getViewer } from "@/shared/auth/require-viewer";
import { logAudit, clientIp } from "@/shared/audit/log";
import { USER_ROLES } from "@/shared/auth/types";

export async function POST(request: Request) {
  const viewer = await getViewer();
  const { origin } = new URL(request.url);
  if (!viewer) return NextResponse.redirect(`${origin}/login`, { status: 303 });
  const { supabase, user } = viewer;

  const form = await request.formData();
  const submitted = String(form.get("role") ?? "");
  const role = USER_ROLES.find((r) => r === submitted);
  if (!role) {
    return NextResponse.redirect(`${origin}/role`, { status: 303 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", user.id);

  if (!error) {
    await logAudit(supabase, {
      userId: user.id,
      action: "role_selected",
      detail: { role },
      ip: clientIp(request),
    });
  }

  return NextResponse.redirect(`${origin}/dashboard`, { status: 303 });
}
