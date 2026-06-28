import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit, clientIp } from "@/lib/audit";
import { USER_ROLES, type UserRole } from "@/lib/profile";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { origin } = new URL(request.url);
  if (!user) return NextResponse.redirect(`${origin}/login`, { status: 303 });

  const form = await request.formData();
  const role = String(form.get("role") ?? "");
  if (!USER_ROLES.includes(role as UserRole)) {
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
