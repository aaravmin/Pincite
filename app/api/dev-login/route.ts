import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit, clientIp } from "@/lib/audit";

/**
 * DEVELOPMENT-ONLY sign-in endpoint for the Playwright verification gate, so
 * protected screens can be exercised without the Google OAuth round-trip.
 *
 * Hard-gated: returns 404 unless NODE_ENV === "development", and requires the
 * DEV_LOGIN_SECRET. A production build (NODE_ENV=production) disables it entirely.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not found", { status: 404 });
  }

  let body: { email?: string; password?: string; secret?: string };
  try {
    body = await request.json();
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }

  const secret = process.env.DEV_LOGIN_SECRET;
  if (!secret || body.secret !== secret) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  if (!body.email || !body.password) {
    return new NextResponse("Missing credentials", { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });
  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? "no user" },
      { status: 401 },
    );
  }

  await logAudit(supabase, {
    userId: data.user.id,
    action: "login",
    ip: clientIp(request),
    detail: { provider: "password", dev: true },
  });

  return NextResponse.json({ ok: true });
}
