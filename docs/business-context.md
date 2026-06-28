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
  - [ ] Voyage account zero-retention opt-out confirmed (no per-request signal; verify in dashboard).
  - [x] Supabase US-region + encryption at rest + per-user RLS.
  - Uploads: stored encrypted in a US-region Supabase Storage bucket (per-user RLS), never to a non-ZDR vendor.

## Risks to keep in mind (roadmap §11)
Hallucinated citations (mitigated by corpus-validated cites), over-trust of the
similarity score (lead with spans, decompose the score), drift toward legal advice
(cited-research framing + verify labels + human in loop), stale MPEP (version + show
edition), foreign-filing-license trip (US-only infra + conditional warning).
