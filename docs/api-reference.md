# API reference & vendor notes

> External services, env vars, and integration notes. Behind `CLAUDE.md`.

## Environment variables (`.env.local`; never commit)
| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client (browser-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase server-only admin key (never to client) |
| `XAI_API_KEY` / `GROK_MODEL` / `GROK_FAST_MODEL` | Grok generation (OpenAI-compatible, https://api.x.ai/v1) |
| `GEMINI_API_KEY` / `GEMINI_MODEL` / `GENERATION_PROVIDER` | Gemini fallback; provider switch (grok\|gemini) |
| `VOYAGE_API_KEY` / `EMBEDDING_MODEL` | Voyage embeddings (voyage-law-2) |
| `MPEP_EDITION` | edition label stamped on ingested sections |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth (Supabase Auth provider) |
| `USPTO_API_KEY` | USPTO ODP (optional/secondary patent source) |
| *(Phase 7)* `GOOGLE_APPLICATION_CREDENTIALS` or inline SA JSON | BigQuery service account |

## Generation — Grok (primary), Gemini (fallback)
- OpenAI-compatible endpoint `https://api.x.ai/v1`. Model `grok-4.3`.
- `GENERATION_PROVIDER` switches grok|gemini; fall back to Gemini on Grok failure.
- **Confidentiality:** any model that sees invention text inherits the Phase 0 terms —
  see `business-context.md` pre-production checklist.

## Embeddings — Voyage `voyage-law-2`
- Legal-domain embeddings for MPEP chunks + patent claims/abstracts; stored in pgvector.

## Prior art — Google BigQuery `patents-public-data` (Phase 7)
- Official Google path (no official Google Patents REST API exists). US multi-region.
- Auth: a **service account JSON key** for a Google Cloud project owned by Pincite
  (server-side; NOT per-user). Free tier: first 1 TiB scanned/month, then ~$6.25/TiB.
- Tables expose full **US** claim + specification text + CPC (non-US patents are
  bibliographic only). One query per search; no bulk download (roadmap guardrail).
- "Google sign-in" in the product = app user login via Google OAuth (Supabase). It is
  SEPARATE from BigQuery's service-account auth.
- Secondary/fallback sources if needed: USPTO Open Data Portal (free, US, account-gated).

## MPEP corpus (Phase 2)
- Ingest full MPEP → `mpep_sections`/`mpep_chunks` with edition + source URL recorded.
- Source to confirm with user before ingest (USPTO HTML/PDF vs maintained mirror).

## Supabase
- Region must be US (confirm before processing real text). RLS on every user table.
- Server client in `lib/supabase/server.ts` (cookies via `@supabase/ssr`); browser client
  in `lib/supabase/client.ts`; auth refresh in `lib/supabase/middleware.ts`.
