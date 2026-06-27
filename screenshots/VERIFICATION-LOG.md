# Verification log (roadmap §7)

One line per feature gate. PASS only when: zero console errors, zero page exceptions,
no failed requests on the feature path, and the screenshot matches the spec including
the §2.1 color discipline.

| Date | Phase / feature | Result | Screenshot | Notes |
|---|---|---|---|---|
| 2026-06-26 | phase-0 landing | PASS | phase-0-landing.png | Clean Notion-style landing; neutral palette only; no console/page/network errors. |
| 2026-06-26 | phase-0 login | PASS | phase-0-login.png | Google sign-in button renders; connects to new dedicated Supabase project; neutral palette; clean. |
| 2026-06-26 | phase-0 consent | PASS | phase-0-consent.png | Consent/warning screen; yellow attention box used correctly; clean. |
| 2026-06-26 | phase-0 dashboard | PASS | phase-0-dashboard.png | Empty dashboard shell after consent; neutral palette; clean. |
| 2026-06-26 | phase-0 RLS isolation | PASS | (script) | scripts/verify-rls.mjs: cross-user reads/writes blocked, own-row access works. |
| 2026-06-26 | phase-0 audit logging | PASS | (in protected spec) | login + consent_granted recorded for the test user. |
| 2026-06-26 | phase-0 Grok connectivity | PASS | (curl) | grok-4.3 via api.x.ai returns 200; key + model id valid. |
| 2026-06-26 | phase-0 Google OAuth redirect | BLOCKED | phase-0-google-oauth (n/a) | Supabase authorize returns "provider is not enabled" — Google provider toggle/Save pending in project cvmmdcebgegegpkqyzfq. |
| 2026-06-27 | phase-0 Google OAuth redirect | PASS | phase-0-google-oauth.png | Provider enabled in Supabase; login button redirects to accounts.google.com with no config error. Phase 0 closed. |
| 2026-06-27 | phase-1 structured intake + autosave | PASS | phase-1-intake.png | Section nav + plain-text editors; debounced autosave shows "Saved"; word count; neutral palette only; clean. |
| 2026-06-27 | phase-1 save version | PASS | phase-1-save.png | Save-as-version appends an immutable snapshot; dialog clean; neutral palette. |
| 2026-06-27 | phase-1 version history | PASS | phase-1-versions.png | Dated saves listed; restore/branch present; neutral palette; clean. |
| 2026-06-27 | phase-1 restore into new save | PASS | phase-1-restore.png | Restore opens a snapshot into a new save; history intact; clean. |
| 2026-06-27 | phase-1 RLS + append-only (DB) | PASS | (scripts/verify-phase1.mjs) | Cross-user reads/writes blocked; version update/delete blocked; project-ownership insert check (42501). |
| 2026-06-27 | phase-1 e2e gate | PASS | (e2e/projects.spec.ts) | create -> autosave -> 2 versions -> restore; audit has project_created/section_edited/version_saved/version_restored; zero console/page/network errors. |
| 2026-06-27 | phase-2 evidence pane (Ask) | PASS | phase-2-evidence-pane.png | Ask "2111.03 ..." loads full MPEP 2111.03 in the half-screen evidence pane with the responsive passage highlighted yellow; neutral elsewhere; clean. |
| 2026-06-27 | phase-2 citation-validate (drop fake) | PASS | phase-2-fake-cite-dropped.png | "MPEP 2111.99" reported as not in the corpus and dropped; no fabricated text shown; clean. |
| 2026-06-27 | phase-7 prior-art pinpoint overlaps | PASS | phase-7-prior-art-overlaps.png | Deterministic compare: claim limitations underlined, patent passages tagged, red full-limitation markers, decomposable score, standing not-FTO disclaimer; clean. Live BigQuery wired + dry-run validated (~135 GB/search). |
| 2026-06-27 | phase-4 validator Tier 1 + findings | PASS | phase-4-findings.png | Seeded over-length abstract + non-single-sentence claim flagged red (Violation/Fixable); multiple-dependent fee flagged yellow (Attention/Informational); correct MPEP/CFR pins; clean. |
| 2026-06-27 | phase-4 finding opens pinned rule | PASS | phase-4-finding-rule.png | "Open MPEP 608.01(b)" loads the full section in the evidence pane; clean. |
