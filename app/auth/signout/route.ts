import { NextResponse } from "next/server";
import { cookies } from "next/headers";
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
  const response = NextResponse.redirect(`${origin}/login`, { status: 303 });
  // Clear the Supabase auth cookies on the redirect response itself. Mutating the cookie
  // store does not always carry onto a manually returned redirect, so without this the old
  // session can persist and the next sign-in appears to keep the previous account.
  const store = await cookies();
  for (const c of store.getAll()) {
    if (c.name.startsWith("sb-")) response.cookies.delete(c.name);
  }
  return response;
}
