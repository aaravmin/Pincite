/**
 * Demo mode: the app is running with no Supabase project configured, so nothing can be
 * signed in to, stored, or paid for. It activates on its own when NEXT_PUBLIC_SUPABASE_URL is
 * unset (a fresh clone with no .env.local) or empty (the `pnpm dev:demo` script), and every
 * demo branch in the codebase is guarded by this one function, so a configured deployment
 * never takes any of them.
 *
 * It never activates on Vercel. A production deployment that lost its Supabase URL must fail
 * closed (the real clients refuse to construct without it) rather than quietly serve the
 * demo with its always-signed-in viewer in place of the real app.
 *
 * In demo mode the database is an in-memory store seeded with the public Apple container
 * case study (shared/db/demo), and every external provider returns precomputed output
 * (shared/demo/canned.ts). The deterministic validators run for real.
 *
 * PURE: env reads and nothing else, so middleware, layouts, shared plumbing, and feature
 * code can all ask the same question. NEXT_PUBLIC_* values are inlined into client bundles;
 * VERCEL is server-only, so the answer is only meant to be asked on the server.
 */
export function isDemoMode(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.VERCEL;
}
