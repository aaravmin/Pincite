# CLAUDE.md — Pincite

Active patent review workbench. The user pastes an in-progress patent section by
section; Pincite detects the stage, flags rule violations pinned to real MPEP/CFR text,
surfaces rules that apply now + may apply next, finds similar public patents with
pinpoint overlaps, and saves everything as versioned, audited, exportable sessions.
**Core discipline: no claim reaches the screen without a citation that resolves to real
text.**

This file is the index. Keep it **200–250 lines max**; route detail to `/docs` and the
roadmap. Update it on every MAJOR task, new skill, new gotcha/pattern/convention, and at
the end of each session — but be stringent; trim before it bloats.

## Routing
- Full product spec / requirements: `Pincite-Product-Roadmap.md`
- Build execution plan (phases, gates): `~/.claude/plans/reactive-squishing-dongarra.md`
  (supersedes the earlier `start-in-plan-mode-reactive-willow.md`)
- Architecture & data model: `docs/architecture.md`
- UI / color system / component conventions: `docs/style-guide.md`
- Why the product exists, legal posture, scope lines: `docs/business-context.md`
- External APIs, env vars, vendor notes: `docs/api-reference.md`

## Stack (authoritative; reconciled with `.env.local`)
- Next.js 15 (App Router) + React 19 + TypeScript, Tailwind v4 + shadcn/ui (new-york).
- Supabase (Postgres + pgvector, Auth, Storage) — **must be US region**; RLS per user.
- Auth: **Google sign-in** via Supabase provider (creds in `.env.local`).
- Generation LLM: **Grok `grok-4.3`** primary, Gemini fallback (OpenAI-compatible API).
- Embeddings: **Voyage `voyage-law-2`** (legal-tuned), stored in pgvector.
- Prior art: **Google BigQuery `patents-public-data`** (server-side service account);
  **PatentsView** (free, no key, query by CPC/keyword) as fallback.
- Verification: **Playwright** (the `verify-feature` skill / §7 gate).
- Package manager: **pnpm**.

## How we work (non-negotiable)
- **Verify-feature gate after every feature** (skill: `.claude/skills/verify-feature`).
  A feature is done only when: zero console errors, zero page exceptions, no failed
  requests on its path, and the screenshot matches the spec incl. color discipline.
  Screenshots in `/screenshots`; one-line result in `screenshots/VERIFICATION-LOG.md`.
  **Playwright** (scripted, reproducible gate) and **browser-harness** (live Chrome
  driving) are both first-class — pick per task, neither is a fallback. browser-harness
  learning is always on (`BH_DOMAIN_SKILLS=1`, set in `.claude/settings.local.json` env).
- **Task-by-task.** Don't start the next until 95% sure the current is fully functional.
- **Ask before assuming.** If a feature needs an input I can't safely default (a
  credential, a legal/business call, ambiguous UX), pause, say exactly how to provide it.
- **Subagents in parallel** (defs in `.claude/agents/`: route-mapper, todo-collector,
  dep-auditor, researcher, reviewer). Bulk reading/scraping → Haiku/Sonnet; scoped code →
  Sonnet; architecture/correctness/review → Opus. All report back. In-session bulk → Claude
  Code subagents; scheduled/recurring (e.g. weekly patent monitoring) → Hermes.
- **Synthetic data only** until vendor zero-retention is confirmed (see business-context).

## Conventions
- Strict color system (roadmap §2.1), enforced in review + the verify gate:
  red=violation only, yellow=attention/highlight/conditional only, green=applies-&-passes
  only. Neutrals (white/black/gray) carry everything else. Tokens in `app/globals.css`:
  `violation` / `attention` / `pass`, each with `-bg` and `-foreground`. Never use raw
  Tailwind palette colors (e.g. `text-blue-500`) in app code.
- Every colored item also carries a text label + shape (solid dot=violation, outline
  dot=conditional, check=pass) — color is never the only signal (accessibility).
- **Section editors are plain-text, not rich-text**, so character offsets for finding/
  highlight spans stay stable. See `docs/style-guide.md`.
- Saves are **append-only** immutable snapshots; never overwrite history.
- Every cited section number is validated against the corpus before display.

## Gotchas (discovered)
- **Port 3100.** Pincite dev/start are pinned to `:3100` because `:3000` is the user's
  separate `Desktop/Jarvis` app. `pnpm dev` → http://localhost:3100.
- **pnpm 11.7 build approval.** Native builds are allowlisted in `pnpm-workspace.yaml`
  under `allowBuilds:` (sharp, unrs-resolver). The `pnpm` field in package.json and
  `onlyBuiltDependencies` are ignored by this pnpm version. Without this, `pnpm install`
  exits 1 and `next build` fails.
- **Tailwind v4 + shadcn.** Did NOT use `--color-*: initial` (it breaks shadcn's required
  neutral tokens). Palette discipline is enforced by review/gate instead.
- **Middleware allowlist.** `lib/supabase/middleware.ts` must let `/`, `/login`, `/auth`,
  and `/api` through, or it 307-redirects API/auth POSTs to `/login` (silently breaks them).
- **E2E auth without Google.** Protected screens are tested via a dev-only `/api/dev-login`
  (gated by `NODE_ENV==='development'` + `DEV_LOGIN_SECRET`) that signs in a test user with
  email/password; Playwright `page.request.post` shares cookies with the page. Test user +
  consent/audit reset live in `e2e/global-setup.ts`; `loginAsTestUser` also resets the test
  user (consent, audit, projects) per spec so the full suite is order-independent. Never
  enabled in production builds.
- **Supabase project.** Dedicated project `cvmmdcebgegegpkqyzfq` (the old shared one was
  Jarvis's). Region: user-selected US (definitive confirm needs the Management API).
- **Migrations apply path.** Apply SQL with `node --env-file=.env.local scripts/db-apply.mjs
  <file>` using `SUPABASE_DB_URL` (+ optional raw `SUPABASE_DB_PASSWORD`) in `.env.local`.
  After DDL, PostgREST serves a stale cache — run `notify pgrst, 'reload schema'` or the API
  reports "table not in schema cache". Service-role key does DML/RLS tests, not DDL.
- **Voyage free-tier throttle.** No payment method on the Voyage account = 3 RPM / 10K TPM,
  so bulk embedding 429s. Add a card at dashboard.voyageai.com (the 200M free tokens still
  cover the MPEP). Corpus TEXT ingests without Voyage; embeddings are a separate resumable
  pass (`scripts/embed-mpep.mjs`) used for semantic locate.
- **BigQuery prior-art cost.** A live keyword search scans ~135 GB (~$0.82); free tier is
  1 TiB/mo (~12 searches). `maximumBytesBilled` cap is 160 GB. The "Compare a patent" path
  is free (no BigQuery). Service-account key lives at `~/.config/pincite/bq.json` (outside
  the repo), referenced by `GOOGLE_APPLICATION_CREDENTIALS` in `.env.local`.

## Skills
- `verify-feature` — the §7 gate as a documented, reusable procedure. Built Phase 0.
- `techdebt` — scan for dead code, duplication, complexity, unused deps, TODOs.
  (citation-validation, MPEP ingestion, code-review, patent-search, article-ingest are
  plain code/subagent runs for now; promote to skills on request.)

## Phase status
- [x] Phase 0 — DONE + CLOSED: scaffold, palette, Playwright + verify-feature, docs,
      Supabase + dedicated US project, RLS cross-user test (PASS), audit_log + login/consent
      logging, Grok smoke (PASS), consent screen, dashboard shell, Google OAuth redirect (PASS).
- [x] Phase 1 — DONE: projects + structured intake (plain-text editors), debounced autosave,
      append-only versioning (save/restore/branch), audit; migration 0002 applied; e2e gate +
      RLS/append-only DB check PASS.
- [~] Phase 2 — corpus ingested (1908 sections, all 29 chapters, text; migration 0003,
      pgvector). Evidence pane + Ask (`/ask`), locate (keyword/number), `lib/mpep/*`
      (load/locate/citation/highlight), citation-validate drop — DONE + gated. Embeddings
      DONE (2902 chunks). Enhancements not yet wired: semantic locate into `/ask`, Grok answer.
- [~] Phase 7 — prior art (feature 3): schema 0004, `lib/patents/*` (extract + pinpoint
      match + transparent score), results UI + overlap evidence pane (yellow overlap / red
      full-limitation) — DONE + gated on the free deterministic "Compare a patent" path.
      Live BigQuery search wired + dry-run validated (~135 GB ≈ $0.82/search). Enhancement:
      semantic candidate ranking via Voyage.
- [x] Phase 4-5 — validator (feature 1 error-checking) DONE + gated: Tier 1 structural,
      Tier 2 consistency (MPF 2181, antecedent 2173.05(e)), Tier 3 relative terms 2173.05(b)
      + §101 Alice/Mayo walkthrough (Grok, MPEP 2106, neutral/verify) in `lib/validators/*`;
      `/review` findings (color + actionable/informational) open the pinned rule. migration 0005.
- [x] Phase 3 — stage detection: transparent engine (`lib/stage/detect.ts`), `/stage` view
      (why + what's missing) + declared-status form; detected stage + open-red-findings count
      on the dashboard. DONE + gated; full e2e suite 9/9 green.
- [x] Phase 6 — rule surfacing: `lib/rules/surface.ts` applies-now (green) + conditional
      (yellow, with trigger + "now applies" when met) keyed to stage/type/draft; `/rules`,
      pins corpus-validated + openable in the evidence pane. DONE + gated.
- [x] Phase 8 — export: `lib/export/report.ts` (TXT serializer + report view), `/report`
      print-to-PDF (grayscale-legible: labels + filled/outline markers) and
      `/api/projects/[id]/export?format=txt`; logged to `exports` + audit. migration 0006.
- [ ] Phase 9 — polish: version-history/audit-log viewers, accessibility (axe), perf.

## Commands
- `pnpm dev` — dev server on :3100.   `pnpm build` — production build.
- `pnpm verify` — run all Playwright gates.   `pnpm lint` — eslint.
- `pnpm exec playwright test e2e/<feature>.spec.ts` — run one gate.
