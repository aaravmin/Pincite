# Business context

> Why Pincite exists and the lines it must not cross. Behind `CLAUDE.md`. Full posture in
> `Pincite-Product-Roadmap.md` §0, §1, §10, §11.

## What it is
A legal research and review aid — **not legal advice, not a drafting service.** It
ingests the user's draft, locates governing rules, flags inconsistencies and likely rule
violations against real MPEP/CFR text, surfaces conditional future rules, and finds and
pinpoints similar public patents — human in the loop, every assertion cited.

## What it deliberately does NOT do
- Draft or auto-write claims/specs/filings (it critiques what the user wrote).
- Render validity / patentability / freedom-to-operate opinions (a similarity hit is a
  candidate to verify, not a conclusion).
- Touch a USPTO account, file, or pay anything.
- Process privileged/client data outside the Phase 0 confidentiality controls.

Why: the USPTO treats blind reliance on an AI tool as a failure of reasonable inquiry.
Pincite supports the inquiry; it does not replace it.

## Actionable vs informational (never confuse them)
- **Actionable** — the user can fix it in-app (rewrite a claim, add antecedent basis).
- **Informational** — true and worth knowing but NOT something to act on in-app (a USPTO
  fee, a statutory deadline, an examiner action). The app never gives a field to "do"
  an informational item; it states and pins it. UI styles the two differently.

## Confidentiality posture (gates turning review features on)
Hard requirements (roadmap §0.1): US-region infrastructure only; zero-data-retention
model/embedding calls; no training on inputs; encryption at rest + in transit; per-user
RLS isolation; standing consent/warning on intake.
- Legal reason: unfiled US-origin invention text routed abroad risks a foreign-filing-
  license problem (35 U.S.C. 184); a retaining/training model risks the duty of
  confidentiality.

### Current decision (locked with user)
- **Synthetic / non-confidential text only for now.** xAI's API reports the team does NOT
  have zero-data-retention (the `x-zero-data-retention` response header is "false"; setting
  it on the request 400s: "team does not have zero data retention enabled"). So real
  invention text is NOT yet permitted, despite the intent to enable ZDR. Surfaced to the user.
- **Pre-production checklist (before ANY real invention text):**
  - [ ] xAI Grok enterprise ZDR enabled on the team (response header reads "true"). CURRENTLY OFF.
  - [x] Voyage account zero-retention / no-training opt-out confirmed (2026-06-28, user opted out of
    training in the dashboard; Voyage gives no per-request signal). One vendor cleared; xAI still blocks
    real invention text, so the synthetic-only posture stands until xAI ZDR flips on.
  - [x] Supabase US-region + encryption at rest + per-user RLS.
  - Uploads: stored encrypted in a US-region Supabase Storage bucket (per-user RLS), never to a non-ZDR vendor.

### Cost / abuse posture (security-audit, 2026-06-28)
- **Per-user rate limiting** (migration 0011): every paid endpoint is throttled server-side via the
  `consume_rate_limit` SQL function before the provider call - BigQuery live search (6/hr + 20/day, the
  ~$0.82/scan path), Grok §101 (30/hr), Grok vision (30/hr), Voyage Ask (60/hr), free compare (60/hr).
  The `api_usage` table is not user-writable (only the security-definer function and the service role
  write it), so a client cannot reset its own quota. Fails closed.
- **Still recommended (account-level, user action):** hard budget caps / alerts on xAI, BigQuery (GCP),
  and Voyage, since per-user limits bound abuse but not a runaway total. BigQuery also caps each query at
  160 GB (`maximumBytesBilled`).
- RLS audit (2026-06-28): all 15 tables owner-scoped, no cross-tenant read/write, admin/service-role
  call sites verify ownership first; no billing/tier/is_admin columns exist. Clean.

## Risks to keep in mind (roadmap §11)
Hallucinated citations (mitigated by corpus-validated cites), over-trust of the
similarity score (lead with spans, decompose the score), drift toward legal advice
(cited-research framing + verify labels + human in loop), stale MPEP (version + show
edition), foreign-filing-license trip (US-only infra + conditional warning).
