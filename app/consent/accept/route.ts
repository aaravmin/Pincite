import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit, clientIp } from "@/lib/audit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { origin } = new URL(request.url);
  if (!user) return NextResponse.redirect(`${origin}/login`, { status: 303 });

  const { error } = await supabase
    .from("profiles")
    .update({ consented_at: new Date().toISOString() })
    .eq("id", user.id);

  if (!error) {
    await logAudit(supabase, {
      userId: user.id,
      action: "consent_granted",
      ip: clientIp(request),
    });
  }

  return NextResponse.redirect(`${origin}/role`, { status: 303 });
}
