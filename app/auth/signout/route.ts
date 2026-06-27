import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit, clientIp } from "@/lib/audit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await logAudit(supabase, {
      userId: user.id,
      action: "logout",
      ip: clientIp(request),
    });
  }
  await supabase.auth.signOut();

  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/`, { status: 303 });
}
