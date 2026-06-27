# Architecture

> Detail behind `CLAUDE.md`. The product spec is `Pincite-Product-Roadmap.md` (§3 data
> model, §4 engines). This doc records how we actually build it.

## Layout (Next.js App Router)
```
app/            routes (RSC by default); route handlers under app/api/*
components/      shared React components
  ui/            shadcn primitives (added on demand via shadcn CLI)
lib/             non-UI logic
  supabase/      server.ts (RSC/route-handler client), client.ts (browser), middleware.ts
  llm/           Grok/Gemini generation client (OpenAI-compatible)
  embeddings/    Voyage client
  patents/       BigQuery patents-public-data access (Phase 7)
  validators/    Tier 1/2/3 checks (Phases 4-5)
e2e/             Playwright specs + helpers.ts (the verify-feature harness)
screenshots/     verification screenshots + VERIFICATION-LOG.md
supabase/        SQL migrations (schema, RLS policies)
docs/            this folder
```

## Data model (roadmap §3) — built incrementally per phase
New tables: `projects`, `project_sections`, `project_versions`, `findings`,
`applicable_rules`, `prior_art_matches`, `match_spans`, `audit_log`, `exports`.
v1 corpus/answer tables: `mpep_sections`, `mpep_chunks`, `queries`, `answers`,
`citations`, `pages`, `page_items`.
- All user-scoped tables enforce **RLS** on `user_id`; cross-user reads must fail.
- **Saves are append-only**: `project_versions` snapshots full section JSON; restore
  opens an old snapshot into a NEW save; branch via `parent_version_id`.
- `findings.span_start/span_end` and `match_spans` store **character offsets** into the
  stored section text → highlights are computed from offsets (see style-guide for why
  editors are plain-text).
- `audit_log` is append-only: action + detail (old/new) + ip + timestamp.

## Engines (roadmap §4), by phase
- **Locate→load→highlight (§4.5):** keyword/section-number index + pgvector semantic
  search → pick section with a fast model → load full section from corpus → model returns
  offsets to highlight. Corpus is local/versioned; no live USPTO scraping at request time.
- **Validator (§4.3):** Tier 1 deterministic (no model), Tier 2 deterministic parse +
  model assist (cross-section), Tier 3 model+retrieval (judgmental, always "verify").
- **Stage detection (§4.2):** transparent rules engine over which sections exist +
  completeness + declared status flags. Reports what's missing to advance.
- **Rule surfacing (§4.4):** applies-now (green) + conditional (yellow, with trigger).
- **Prior art (§4.6):** limitation extraction → CPC scope → BigQuery candidates → Voyage
  ranking → element-level pinpoint overlaps → transparent composite score.

## Citation validation (anti-hallucination spine)
Every model-produced section number is checked against `mpep_sections` before display;
unresolved cites are dropped and the output flagged for review. Reused by findings, rule
surfacing, and Ask. Built as a utility in Phase 2.

## TODO census
Main agent leaves `TODO(phase-N):` comments for subagents/follow-up; periodically swept.
