# CLAUDE.md - Pincite

Active patent review dashboard. The user drafts a US patent section by section; Pincite detects
the stage, flags rule violations pinned to real MPEP/CFR text, surfaces rules that apply now and
may apply next, finds similar public patents with pinpoint overlaps, checks drawings, and produces
a filing-ready document set. **Core discipline: no claim reaches the screen without a citation that
resolves to real corpus text.** Not legal advice, not a filing service; a human stays in the loop.

This file is the operating guide for agents. Keep it under 200 lines and current: no phase history
(git log has it), no plans. The architecture, feature map, request flows, and testing layers are
documented for humans in `README.md` (section "Architecture"); this file assumes you read it.

## Stack (authoritative)
- Next.js 15 App Router + React 19 + TypeScript strict, Tailwind v4 + shadcn/ui (new-york), pnpm 11, Node 24.
- Supabase (Postgres + pgvector, Auth, private Storage), **US region**, RLS on every user table.
  Dedicated project `cvmmdcebgegegpkqyzfq`. Auth: Google OAuth + email/password via Supabase.
- Generation: Grok `grok-4.3` (OpenAI-compatible), Gemini fallback. Embeddings: Voyage `voyage-law-2`.
- Prior art: Google BigQuery `patents-public-data` (service account), keyless Google Patents fallback.
- Tests: Vitest (unit + application, credential-free) and Playwright (e2e gate + axe a11y).

## Layout and boundaries (enforced by `pnpm lint`)
```
app/(public)  app/(protected)  app/consent  app/role  app/auth  app/api     thin routes only
features/<f>/{domain,application,infrastructure,actions.ts,ui}                 one folder per capability
shared/{auth,db,audit,rate-limit,llm,text,format.ts,utils.ts}                  framework plumbing
components/{ui,brand,marketing,command,workspace,dashboard/sidebar}            app shell + site
src/visual  remotion                                                           shared visuals + demo film
```
- Direction: routes/ui -> application -> domain; application -> infrastructure. Domain is pure
  (no next/react/supabase/server-only/network/clock/auth). A feature may import another feature's
  domain, application, actions, or ui, never its infrastructure. UI/components/app never import
  infrastructure, `shared/db/{server,admin}`, `shared/llm`, `shared/audit/log`, or the rate limiter.
  `@/lib/*` is forbidden repo-wide. See `eslint.config.mjs`; fix violations by moving code, never by
  disabling the rule.
- `import "server-only"` is the first line of every application and infrastructure module.
- A page is: `await params` -> `await requireViewer()` -> one application loader -> `notFound()` ->
  render. A route handler is: `getViewer()` -> 401 -> parse -> one application call -> response,
  never a redirect. A server action is: `requireViewer()` -> validate -> one application call ->
  `revalidatePath` -> serializable result, under ~40 lines.
- Application modules take a small `deps` object defaulting to the feature's infrastructure so they
  are testable with in-memory fakes. Infrastructure functions take `supabase: TypedSupabaseClient`
  first. No generic abstraction until two real consumers need it.
- `getProjectSnapshot(projectId)` (features/projects/application) is the canonical per-matter loader:
  `React.cache`d per request, six reads under `Promise.all`, null when not visible, uses `getViewer`
  (no redirect). Never read the snapshot after a write in the same request (it is stale); use the
  feature's own fresh reader. The dashboard stays batched (one query per table) and must not loop
  the snapshot per project. Nothing user-scoped ever goes in a persistent Next cache.
- Auth: `shared/auth/require-viewer.ts`. `getViewer` (nullable), `requireViewer` (auth + consent),
  `requireUser` (auth only, for consent/role screens and `recordLogin`). RLS is defense in depth;
  ownership is checked through the user client before any admin/Storage work.
- Typed DB: `shared/db/database.types.ts` is hand-derived from `supabase/migrations`; after any
  migration update it (or regenerate with `supabase gen types typescript --project-id <id>`), and map
  rows to domain objects explicitly where shapes differ (jsonb columns).

## How we work (non-negotiable)
- **Gate every feature.** Unit/application tests for any domain or application change
  (`pnpm test`), `pnpm typecheck`, `pnpm lint`, `pnpm build`, and the Playwright gate for anything
  user-facing (skill `.claude/skills/verify-feature`): zero console errors, zero page exceptions, no
  failed requests, screenshot matches the spec incl. color discipline. Screenshots go to
  `/screenshots` (only `case-*.png` are tracked). Playwright needs `.env.local` (see Gotchas).
- **Task-by-task.** Do not start the next task until the current one is verified.
- **Ask before assuming** when a feature needs a credential, a legal/business call, or ambiguous UX.
- **Subagents in parallel** for bulk reading/scoped code/review (`.claude/agents/`: route-mapper,
  todo-collector, dep-auditor, researcher, reviewer). Skills: `verify-feature`, `techdebt`,
  `security-audit` (run before any release touching auth, schema, billing, or an AI endpoint).
- **Synthetic / non-confidential text only** until xAI ZDR is on (the `x-zero-data-retention`
  response header reads "false"; Voyage opt-out done 2026-06-28). Consent screen says so.
- Commit messages describe the change precisely; never add an agent co-author line. No em dashes
  anywhere (code, copy, docs, commits); plain "-" only. No emojis in product copy.

## Conventions
- Color system: red = violation only, yellow = attention/conditional only, green = applies-and-passes
  only; neutrals carry everything else. Tokens in `app/globals.css` (`violation`/`attention`/`pass`
  with `-bg`/`-foreground`). Never raw Tailwind palette colors. Every colored item also carries a
  text label and a shape (solid dot = violation, outline dot = conditional, check = pass).
- Actionable vs informational findings are styled and worded differently; the app never offers a
  field to "do" an informational item (a fee, a deadline), it states and pins it.
- Section editors are plain text so `span_start/span_end` offsets stay stable; highlights overlay.
- Saves are append-only snapshots (`project_versions`); restore/branch create a NEW version.
- Every cited MPEP section number is validated against the corpus before display (`validateCitations`,
  `resolvePins` in features/mpep); unresolved pins are nulled, CFR refs still show.
- "Signed" means a `kind=declaration` attachment exists (the hand-signed PTO/AIA/01 uploaded); Pincite
  never verifies a signature. Prior art stays decomposed into spans, never a single novelty score.
- `e2e/` specs are the behavioral contract for the UI: keep data-testids, strings, headers, and
  filenames stable unless the spec is updated in the same change.

## Gotchas
- **Port 3100.** `pnpm dev` runs on :3100 because :3000 is the user's Jarvis app.
- **`.env.local` is not in the repo** and is gitignored. Playwright, dev-login, scripts, and every
  provider need it (names in `.env.example` plus `SUPABASE_DB_URL`, `DEV_LOGIN_SECRET`,
  `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`). Vercel project `pincite` holds production values.
  `pnpm build` needs no secrets (every client is created inside a request).
- **"use server" files may not re-export.** Next rejects `export { x } from` in a use-server file;
  actions must be defined in `features/<f>/actions.ts` and imported from there.
- **`@supabase/ssr` 0.5 vs supabase-js 2.108** disagree on the schema generic, so `shared/db/server.ts`
  and `client.ts` pin `Database` on the factory return type. Upgrade ssr only with the e2e gate.
- **Stale `.next/types` after moving routes** makes `tsc` fail; run `pnpm build` (or delete
  `.next/types`) first.
- **pnpm 11 build approval.** Native builds are allowlisted in `pnpm-workspace.yaml` `allowBuilds:`
  (sharp, unrs-resolver, esbuild). Without it `pnpm install` exits 1.
- **Middleware allowlist** (`shared/db/middleware.ts`) must let `/`, `/home`, `/login`, `/auth`, `/api`,
  `/privacy`, `/terms` through or it 307-redirects API/auth POSTs to `/login`.
- **E2E auth without Google:** dev-only `POST /api/dev-login` (NODE_ENV=development +
  `DEV_LOGIN_SECRET`) signs in the test user; `e2e/global-setup.ts` and `e2e/auth.ts` reset the test
  user (consent, audit, projects, api_usage) so specs are order-independent.
- **Migrations:** `node --env-file=.env.local scripts/db-apply.mjs <file>` via `SUPABASE_DB_URL`; after
  DDL run `notify pgrst, 'reload schema'`. `exports.format` has a CHECK constraint (new formats need
  a migration); a silently swallowed export insert means the CHECK rejected it.
- **Storage needs the admin client.** The SSR client does not carry the user JWT to Storage; verify
  ownership with the user client, then upload/sign/remove via `shared/db/admin.ts`. Bucket
  `project-files` is private, namespaced by `{projectId}/`, and enforces an `allowed_mime_types`
  allowlist (`scripts/setup-storage.mjs`). `project_attachments.analysis`/`view` are written with the
  admin client because the table has no user update policy. `?raw=1` streams same-origin bytes.
- **Rate limits** (migration 0011/0012): `checkRateLimit`/`checkGlobalLimit` in `shared/rate-limit`
  call security-definer SQL functions BEFORE any paid call and fail closed. BigQuery live search
  6/hr + 20/day (~$0.82/scan, `maximumBytesBilled` 160 GB, global 7/month), Grok autofix and §101
  30/hr, vision 30/hr, classify 60/hr, Ask/lookup/compare 60/hr, global Grok 300/day.
  `api_usage` is not user-writable; `e2e/auth.ts` clears it per run.
- **Voyage free tier** is 3 RPM, so bulk embedding 429s; MPEP locate falls back to the ranked
  keyword RPC (`match_mpep_keyword`) and both locate paths skip `[Reserved]`/pointer stubs
  (`isPointerStub` in features/mpep/domain/highlight.ts).
- **BigQuery credentials:** `GOOGLE_APPLICATION_CREDENTIALS` (file, kept outside the repo at
  `~/.config/pincite/bq.json`) or inline `GOOGLE_APPLICATION_CREDENTIALS_JSON`; `bigQueryConfigured()`
  degrades to the keyless path when neither resolves.
- **xAI ZDR header:** do not send `x-zero-data-retention: true` (400s without enterprise ZDR).
- Known pinned quirks (tests assert current behavior; change deliberately): latex `esc()`
  double-escapes a backslash and the Brief Description heading falls back to the raw key with no
  figures; cross-reference flags every component when the spec is empty; rule surfacing counts a
  multiple-dependent claim as independent and ignores patentType.

## Commands
- `pnpm dev` (:3100) - `pnpm build` - `pnpm start`
- `pnpm test` - `pnpm typecheck` - `pnpm lint` - `pnpm exec playwright test [e2e/<spec>]`
- `pnpm reset:account`, `pnpm seed:demo`, `pnpm remotion:studio`, `pnpm remotion:render`
- CI (`.github/workflows/ci.yml`): lint, typecheck, unit tests, build on every push and PR.
