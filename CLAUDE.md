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
- Product functionality (every screen, field, check): `docs/product-functionality.md`
- Build execution plan (phases, gates): `~/.claude/plans/reactive-squishing-dongarra.md`
  (supersedes the earlier `start-in-plan-mode-reactive-willow.md`)
- Architecture & data model: `docs/architecture.md`
- UI / color system / component conventions: `docs/style-guide.md`
- Why the product exists, legal posture, scope lines: `docs/business-context.md`
- External APIs, env vars, vendor notes: `docs/api-reference.md`
- Demo video aids: `docs/demo-script.md` (timed walkthrough) + `docs/demo-pizza-box-fields.md` (box contents)

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
- **Synthetic / non-confidential text only** until xAI ZDR is actually on — its API reports
  ZDR OFF now (`x-zero-data-retention` response = "false"; setting it on the request 400s).
  Voyage opt-out DONE (2026-06-28); xAI is the last blocker. Uploads encrypted US-region. See
  business-context.

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
- **Storage needs the admin client.** The cookie-based SSR client does NOT carry the user
  JWT to Supabase Storage, so Storage RLS rejects writes ("new row violates RLS"). Verify
  ownership with the user client, then upload/sign/remove via `lib/supabase/admin.ts`
  (service role). Bucket `project-files` is private; objects namespaced by `{projectId}/`.
  The bucket also enforces an `allowed_mime_types` allowlist (`scripts/setup-storage.mjs`): a
  new upload type must be added there or Storage 400s the upload (the route then surfaces
  "Upload failed"). The drawing-editor `<img>` streams same-origin via the attachment route's
  `?raw=1` so it can read onto a canvas without tainting it. (3D model upload was removed -
  uploads are images/PDF only.)
- **xAI ZDR header.** Don't send `x-zero-data-retention: true` on Grok requests unless the
  team has enterprise ZDR (xAI 400s: "team does not have zero data retention enabled"). Read
  the response header for ZDR status; it currently reads "false".
- **exports.format CHECK.** `exports.format` is constrained; new formats need a migration
  (0008 added 'docx','package'). A silently-swallowed export insert = the CHECK rejected it.
- **MPEP locate quality (migration 0020).** The keyword fallback (hit whenever Voyage
  throttles - free tier is 3 RPM) used `.textSearch(...).limit()` with NO `order by ts_rank`,
  so it returned matches in physical table order and broad catch-alls (101 "General", 103,
  502.05) won almost every question. Now goes through the `match_mpep_keyword` RPC (ts_rank
  desc, then title-match, then shorter-is-more-specific), and both locate RPCs drop `[Reserved]`
  + "[top]" stubs. Separately, the MPEP has hundreds of pure cross-reference sections whose
  whole body is "See MPEP Chapter 2300." - `isPointerStub` (`lib/mpep/highlight.ts`) detects
  them so `askMpep` skips a stub section (unless the user typed that exact number) and
  `selectResponsivePassage` never highlights a bare pointer line. The user lands on real text,
  not "go look in chapter 2300 yourself." e2e in `ask.spec.ts`.
- **Rate limiting (migration 0011).** Paid endpoints are throttled per user via the
  `consume_rate_limit(kind,limit,window)` SQL function (security definer, atomic check+record)
  called through `lib/ratelimit.ts:checkRateLimit` BEFORE the provider call: BigQuery live search
  6/hr+20/day (~$0.82/scan), Grok §101 30/hr, Grok vision 30/hr, Voyage Ask 60/hr, free compare
  60/hr. Fails closed. `api_usage` has no user write policy (only the definer fn + service role
  write it), so quota can't be reset client-side; `e2e/auth.ts` clears it per run so the suite is
  run-count-independent.

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
      DONE (2902 chunks). Locate quality hardened (migration 0020): ranked keyword RPC +
      pointer-stub skipping so questions land on real text, not "See MPEP Chapter 2300" (see
      Gotchas). Enhancements not yet wired: semantic locate into `/ask`, Grok answer.
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
- [x] Phase 9 — polish: audit-log viewer (`/audit`, filterable) + version history (Phase 1);
      accessibility axe pass (8 screens, 0 serious/critical; `--pass` darkened for AA text).
- ROADMAP COMPLETE (phases 0-9); 13/13 e2e gates green. Optional enhancements not built:
  semantic MPEP locate + Grok cited answer in `/ask` (corpus embedded, ready to wire).
- [x] v3 — USPTO FILING ALIGNMENT (migrations 0007/0008): two roles (attorney portfolio vs
      pro-se guided; self-select after consent, `lib/profile.ts`); inventor + applicant ADS
      intake (PTO/AIA/14 data card, `lib/filing/*`, `/projects/[id]/inventors`); secure
      drawing/doc uploads (private US `project-files` Storage bucket, per-owner RLS,
      `/uploads`); inventor's declaration signing (37 CFR 1.63 / PTO-AIA-01, append-only) +
      a filing-readiness validator tier (`lib/validators/filing.ts`, CFR + corpus-validated
      MPEP) on `/sign` + a `/review` banner; USPTO-aligned export (spec DOCX in 37 CFR 1.77
      order, `lib/export/docx.ts`; filing-package ZIP, `?format=docx|package`); left step-rail
      UI (`components/workspace/step-rail.tsx` + `app/projects/[id]/layout.tsx`). 17/17 e2e
      green + a11y. NOTE: prior art stays decomposed — no single "novelty score" (anti-over-
      trust discipline), despite the reference image. ZDR still OFF (synthetic text only).
- [x] v3.1 — FILING DEPTH: validators are patent_type-aware (threaded through tiers 1-3 +
      detectStage). Utility claim suite (`lib/validators/tier1.ts`) now adds non-existent +
      forward refs, multiple-dependent must-be-alternative + multiple-on-multiple, claim-1
      independent (37 CFR 1.75/1.16; MPEP 608.01(n)); design path = single claim + prescribed
      "ornamental design for [article] as shown" wording (37 CFR 1.153 / MPEP 1503.03), utility
      claim checks skipped. Lifecycle "what to do now" by declared_status (`lib/lifecycle/
      actions.ts`, `/stage`): office-action reply (3->6 mo, abandonment, after-final RCE/appeal),
      issue fee (non-extendable), maintenance fees, publication — CFR + corpus-validated MPEP.
      Invention-disclosure intake (`/disclosure`, `lib/disclosure/*`, table `project_disclosure`,
      migration 0009) separate from the 1.77 spec; cross-reference checks (`lib/validators/
      crossref.ts`) flag a disclosed component not claimed/described + a problem not in the
      Background. Ownership/inventorship checks in the filing tier (company-cannot-be-inventor
      35 USC 100(f)/MPEP 2109; record-assignment 37 CFR 3.81/MPEP 302). `/review` groups
      findings by process area (Claims vs Specification) + filing-readiness + consistency
      banners. 20/20 e2e green + a11y. Design figure/IMAGE analysis intentionally deferred.
- [x] v3.2 — DEMO HARDENING + SETTINGS: prior art runs on any machine — keyless Google
      Patents fallback (`lib/patents/keyless.ts`) when BigQuery creds are absent;
      `bigQueryConfigured()` is true only with inline JSON creds OR an existing key file, so a
      missing file degrades instead of ENOENT. `/review` findings get "Take me to issue"
      (opens the draft section + selects the span via `?section&from&to`) + "Check if fixed"
      (`recheckFinding` re-runs validators, reports gone/still-present). Draft + disclosure
      share one dashboard (new `DisclosureWorkspace`) with an All-sections/All-fields view +
      in-page save. `/settings` (sidebar): dark mode (class on <html> + pre-paint script in
      layout; tokens already in globals.css), role switch (`lib/profile-actions.ts`
      `updateRole`), audit-log CSV export (`/api/audit/export`). Drawing vision review is now
      persisted (migration 0014 `project_attachments.analysis` jsonb, written by `analyzeDrawing`
      via admin client; shown as `initialReview`) so flags survive page leaves; drawing remove
      verified. Public `/privacy` + `/terms` (middleware allowlisted) + Google Search
      Console verification meta tag in the root layout (for OAuth consent-screen domain).
      Demo aids: `docs/demo-script.md` + `docs/demo-pizza-box-fields.md`.
- [x] Readiness overview (`/projects/[id]/overview`, `lib/readiness.ts`): the per-matter home
      you land on when you open a matter (dashboard cards + a step-rail Overview link route
      here; new-project create still lands on Draft). Assembles stage + what-to-advance + a
      depth-weighted completeness bar (neutral fill) + a checklist of all nine steps each with a
      live status and link + a Next-step CTA. Issue/filing counts are computed live by reusing
      detectStage/runTier1-3/runFilingChecks/runCrossRefChecks, so the overview never disagrees
      with the detail screens. Color discipline: red dot = violation only. e2e `overview.spec.ts`.
- [~] DRAWING EDITOR EPIC (4 features, built one by one):
  - [x] F1 auto-orientation: uploading a 2D image auto-assigns its view via vision
    (`classifyDrawingView` in `lib/llm/vision.ts` + `classifyOrientation` action, rate-limited
    `drawing_classify`, assigns only at confidence >= 0.45). Upload Orientation select defaults
    to Auto-detect; a wrong label is correctable per figure (`setAttachmentView` dropdown +
    Detect view re-run in FigureNavigator). e2e `orientation.spec.ts` (deterministic + guarded
    `ORIENT_VISION`).
  - [x] F2 drawing review: the drawing edit/vectorize surface was removed after poor real-world
    results. `DrawingEditor` is now read-only: it displays the uploaded figure/PDF, lets the user
    run the manual vision check, and exports the original image. Filing packages preserve uploaded
    drawing bytes rather than derived editable scenes. e2e `drawing-editor`/`drawing-export`.
  - [x] F3 real signing: USPTO S-signature (37 CFR 1.4(d)) on the inventor declaration - the
    signer's name between slashes /First M. Last/ + printed name + the 1.63 statements;
    `isValidSSignature` (lib/filing/types) shared by the sign action, filing validator (MPEP
    502.02), and export; migration 0016 `project_declarations.s_signature`. e2e `sign.spec.ts`.
  - [x] F4 guided per-error auto-fix on /review: per actionable finding `proposeFix` (Grok marks
    the span, returns an exact before/after, rate-limited `grok_autofix`) -> GitHub-style diff ->
    Accept runs `applyFix` (replace nearest occurrence + save + recompute), Reject discards.
    Manual per finding, not a magic wand. Guarded e2e `auto-fix.spec.ts` (AUTOFIX_AI=1). [drawing
    auto-fix + multi-angle F2.3 deferred as optional polish].
- [x] Real-patent-format export (`?format=latex`, `lib/export/latex.ts`): a ZIP of patent.tex +
  figures typesetting the application like a published patent, following the Pupalaikis uspatent
  GUIDE layout (`~/Downloads/PatentApplicationGuide.pdf`) but SELF-CONTAINED over the article class
  (preamble macros `\psection`/`\ppar`/`\padpara`/`\pclaim`, ulem `\uline`) so it compiles on
  Overleaf/pdflatex with no special package: 1.77 order, centered underlined headings, [0001]
  paragraphs, auto Brief Description of the Drawings from each figure's view, "What is claimed is:"
  + numbered claims, abstract + drawings each own page. Figures are baked into PDFs via
  **pdf-lib** (`lib/export/figure-pdf.ts`; FIG. N caption from LaTeX) using the uploaded drawing
  bytes. Button on Submission; migration 0017
  adds 'latex'. e2e `latex-export.spec.ts`. (No server-side TeX engine; user compiles.)

- [x] VECTOR DRAWING EDITOR REMOVED: the object editor produced noisy, untrustworthy traced
  scenes on real patent drawings. Removed the UI, scene API, vector pipeline, native deps, and
  vector-specific tests. Existing `vector_scene_meta` data may remain in old rows but is ignored.

- [x] Dashboard rows open on click (`components/dashboard/openable-row.tsx`): both the attorney
  portfolio and the inventor list make the whole matter row clickable except `[data-no-open]`
  (delete). 0-1 saves opens the matter overview directly; >1 saves opens a portal menu of the
  saves (latest opens the matter, an earlier one `restoreVersion`s into the draft, plus Create a
  new save). Name is no longer a link; row keeps table roles (onClick + tabindex, no role
  override). `listProjectVersions` action backs the menu. e2e in `roles.spec.ts`.

- [x] Real signing (Sign step): Download the declaration (37 CFR 1.63) as a per-inventor PDF
  (`lib/export/declaration-pdf.ts`, pdf-lib; route `/api/projects/[id]/declaration`), sign it
  off-platform, and Upload the signed copy, kept with the matter (`project_attachments`
  kind=declaration; migration 0018 adds the enum value; `components/filing/declaration-sign.tsx`).

- [x] Signing rework (Sign step): the in-app S-signature is GONE (a click would not hold up).
  Inventors `certify` the five 37 CFR 1.63 statements (`sign-client.tsx`, `signDeclaration` no
  longer takes/validates an s_signature), then download/sign/upload the PDF. Role-aware sign page:
  attorneys get the power of attorney (`buildPoaPdf` in `declaration-pdf.ts`, route `?doc=poa`,
  37 CFR 1.32) PLUS each inventor's declaration to collect, and are NOT asked to certify they are
  the inventor; `DeclarationSign` now takes `downloads[]` + `intro`. Filing-readiness checks moved
  OFF the Sign step (they stay on `/review`); the S-signature block is removed from
  `lib/validators/filing.ts`. e2e `sign.spec.ts` (certify) + `declaration.spec.ts`.

- [x] New matters do NOT auto-open: `new-project-dialog` `router.refresh()`es instead of pushing
  into the matter, so it appears on the dashboard and the user opens it deliberately. All e2e
  create flows go through a shared `createMatter` helper (`e2e/helpers.ts`) that asserts the matter
  appears on the dashboard and returns its id; `saveFiling` helper retries the Inventors save to
  kill a pre-hydration click flake. (No-redirect change touched all 25 create specs.)

- [x] File-output previews (Submission step): each export (filing package, DOCX, LaTeX, review
  report) previews in a half-screen pane before download. `?preview=1` on the export route returns
  the text representation as JSON (no `exports` record); `specToText` in `lib/export/docx.ts` renders
  the spec in 1.77 order. `report-workspace.tsx` keeps the per-format download (testids) + adds a
  Preview button; when the pane opens the report shifts to the left half so the toolbar stays
  clickable (a real half-screen split). e2e `export-preview.spec.ts`.

- [x] Signature = the physically signed declaration only: the in-app "certify these five boxes"
  flow is GONE (`SignClient`/`signDeclaration`/`project_declarations` reads removed - a click
  does not hold up). The Sign step shows the 1.63 statements read-only (what the document says,
  incl. sole/joint-inventor) then download the real declaration (PTO/AIA/01) -> sign by hand ->
  upload; the uploaded signed PDF is the operative signature and is bundled verbatim into the
  filing-package zip under `declarations/` (export route). "Signed" everywhere now means a
  `kind=declaration` attachment exists (validators/filing `hasSignedDeclaration`, readiness,
  step-rail, dashboard next-step/completeness); Pincite never verifies the signature. Removed the
  now-dead `Declaration`/`DeclarationStatements`/`s_signature`/`isValidSSignature`. e2e
  `sign.spec.ts` (rewritten: no certify, statements read-only, package bundles the signed doc).

## Commands
- `pnpm dev` — dev server on :3100.   `pnpm build` — production build.
- `pnpm verify` — run all Playwright gates.   `pnpm lint` — eslint.
- `pnpm exec playwright test e2e/<feature>.spec.ts` — run one gate.
