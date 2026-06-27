# Pincite v2 — Active Patent Review Workbench

### Product Requirements and Build Plan

*Working name only. "Pincite" is a legal term for a citation to an exact page or section, which is what this tool does on every claim it makes. Verify trademark and domain availability before committing.*

---

## 0. What this version is, and how it differs from v1

The v1 document described a **cited MPEP Q&A tool**: ask a procedure question, get a plain-English answer with every rule pinned to its MPEP section. That product still lives at the center of this one and nothing about its discipline changes — *no claim reaches the screen without a citation that resolves to real text*.

v2 turns that engine from a **reference desk** into a **review workbench**. The user no longer just asks questions in the abstract. They paste or type their own in-progress patent into the app, section by section, and Pincite:

1. **Detects what stage they are at** from what they have actually filled in.
2. **Flags problems** in what they have written — internal contradictions, things you are not allowed to say, and specific rule violations, each pinned to the MPEP or CFR section it breaks.
3. **Surfaces the rules that apply now and the rules that *will* apply** depending on what they do next, with the triggering scenario spelled out for the conditional ones.
4. **Finds similar public patents** and pinpoints the exact overlapping language, not just a vague score.
5. **Saves everything** as versioned sessions with full audit history, viewable from a dashboard, and **exports** the whole review as PDF or TXT.

### 0.1 The one posture change that gates everything

v1 was **public-data-only on purpose**, because feeding a client's unfiled invention into a third-party model risks the duty of confidentiality, and routing unpublished US-origin invention text through servers abroad can trip a foreign filing license problem under 35 U.S.C. 184. v1 sidestepped both by never touching private text.

**v2 cannot sidestep them.** The core feature *is* ingesting the user's own in-progress patent — which is exactly the confidential, unfiled invention text v1 refused to handle. That is not a reason to avoid building v2; it is a reason to build the controls v1 deferred *before* the review features ship. These are non-negotiable and they live in Phase 0:

- **US-based infrastructure only.** App, database, file storage, and every model/embedding endpoint must run on US-region infrastructure. This is the concrete mitigation for the foreign-filing-license exposure on unpublished disclosures.
- **Zero-retention model calls.** Use the Anthropic API under a zero-data-retention configuration so prompts containing invention text are not stored by the provider, and confirm the provider does not train on inputs. Apply the same scrutiny to any other vendor (embeddings, rerankers) that sees invention text.
- **Encryption at rest and in transit**, per-user data isolation enforced at the database row level, and a hard wall so one user can never read another's project.
- **Explicit consent and a standing warning** on the intake screen: this is a research aid, the user is responsible for confidentiality, and they should not paste matter they are not authorized to process.
- **A confidentiality mode decision for embeddings** (see 4.6 and 6.0): either use a vetted third-party embedding vendor under the same zero-retention terms, or run an open embedding model on your own US infrastructure so invention text never leaves your boundary. Pick deliberately; do not let it default.

If these are not in place, the review features do not get switched on. Everything below assumes Phase 0 passed.

### 0.2 The principle that keeps it honest: actionable vs informational

Pincite distinguishes two kinds of output and never confuses them:

- **Actionable** — something the user can fix or do *inside the app*: rewrite a claim, add antecedent basis, describe a figure that is referenced but missing, reconcile two contradictory statements.
- **Informational** — something true and worth knowing that the user **cannot and should not act on in the app**: a fee or surcharge the USPTO will charge (paid to the Office, not entered here), a statutory deadline that exists as a fact, a downstream office action the examiner controls.

**The app never asks the user to input anything informational.** It tells them the multiple-dependent-claim fee under 37 CFR 1.16(j) will apply; it does not give them a field to "pay" it. It tells them a three-month shortened statutory period runs from an office action; it does not pretend to file the response. Every finding and every surfaced rule carries this flag, and the UI styles the two differently (see 2).

---

## 1. Scope — what it does and what it deliberately does not do

This is a **legal research and review aid, not legal advice, and not a drafting service.** It says so, and it behaves so.

**It does:** ingest the user's draft, locate the governing rules, flag inconsistencies and likely rule violations against real MPEP/CFR text, surface conditional future rules, and find and pinpoint similar public patents — all with a human in the loop and every assertion cited.

**It does not, in these versions:**

- **Draft or auto-write claims, specifications, or filings.** It critiques what the user wrote; it does not produce the document they will hand to the USPTO. (Reviewing user-supplied text is squarely within scope; ghost-writing the filing is not.)
- **Render a validity, patentability, or freedom-to-operate opinion.** A similarity hit is a candidate to verify, not a legal conclusion that a claim is anticipated or that the user is free to operate.
- **Touch a USPTO account, file anything, or pay anything.** No automated submission, ever.
- **Process privileged or client data outside the Phase 0 controls.** If the controls are not on, the feature is not on.

Why hold this line: the USPTO has been explicit that blind reliance on an AI tool is not a reasonable inquiry. A tool that drafts and files invites exactly that failure. A tool that reviews, cites, and forces verification *supports* reasonable inquiry instead. The product's value is "know the rules and prove them," not "let the machine do it."

---

## 2. The interface — low chrome, color as signal

The UI carries almost no decorative text and **no emojis anywhere**. Words are spent on substance. Meaning is carried by a strict, small color system used the same way on every screen.

### 2.1 The palette and what each color is allowed to mean

| Color | Meaning | Where it appears |
|---|---|---|
| **White** | Canvas / neutral background | Page background, editor surface |
| **Black** | Text, structure, borders | All body text, section frames, the user's own writing |
| **Red** | A violation or a likely rule break | A flagged span in the user's draft; a finding marked as a violation; an element that appears anticipated by prior art |
| **Green** | Relevant and good — applies and passes | A rule that governs the current stage; a check that passed; a section the user completed correctly |
| **Yellow** | Attention — "look here, this applies" | The exact portion of an MPEP section that is responsive, highlighted in place; a conditional/future rule that *may* apply; a relative term or soft language worth a second look |

Rules of use, enforced in code and review:

- A color is **never** used decoratively. If something is red, it is a violation. If it is yellow, it is an applies-here highlight or a conditional. No exceptions, so the user can trust color as data.
- **Severity maps to color, not to tone.** Red = likely actual rule break. Yellow = applies / conditional / soft. Green = applies and is fine.
- **Accessibility:** color is never the *only* signal. Red/green is the most common colorblind confusion, so every colored item also carries a short text label or a shape/icon (a solid dot for violation, an outline dot for conditional, a check for pass). The build must hit WCAG AA contrast for text on every background, and the highlight colors must remain distinguishable in a grayscale render (which also makes the PDF export legible).

### 2.2 The split-screen evidence pane

The defining interaction. When the app makes a claim the user should verify — either *"this part of the MPEP applies"* or *"this is similar to that patent"* — a panel slides in and **takes up half the screen**, putting the user's material on one side and the primary source on the other.

It opens in exactly two situations:

1. **Rule evidence.** The user clicks a finding or a surfaced rule. The left half shows the finding and the specific span of their own draft it concerns. The right half loads the **full MPEP (or CFR) section** that governs it, scrolled to and with **the responsive portion highlighted in yellow** — the rest of the section visible for context so the user reads the rule in its surroundings, not as a decontextualized snippet.
2. **Similarity evidence.** The user clicks a prior-art match. The left half shows their claim or description element. The right half shows the matching public patent with **the overlapping passages highlighted** — yellow for an overlap, a red marker on the element where the match looks like it reads on a full limitation.

The pane never asserts anything that is not visible in it. It is a reading surface for primary sources, dismissable, and it is where "verify it in one click" actually happens.

---

## 3. Data model

This extends the v1 schema (`mpep_sections`, `mpep_chunks`, `queries`, `answers`, `citations`, `pages`, `page_items`) rather than replacing it. New and changed tables:

**`projects`** — one in-progress patent.
`id` · `user_id` · `name` · `patent_type` (utility | design | plant) · `declared_status` (drafting | filed | published | office_action | allowed | granted) · `application_number` (nullable) · `filing_date` (nullable) · `created_at` · `updated_at`.

**`project_sections`** — the structured draft, one row per part of the application.
`id` · `project_id` · `section_key` (title | cross_reference | gov_interest | background | summary | brief_description_drawings | detailed_description | claims | abstract | drawings_meta | office_action) · `content` · `word_count` · `updated_at`.

**`project_versions`** — an immutable snapshot taken on every save. Saving never overwrites; it appends.
`id` · `project_id` · `user_id` · `label` · `snapshot` (full JSON of all sections at save time) · `parent_version_id` (nullable, for branching) · `created_at`.

**`findings`** — one flagged issue.
`id` · `project_id` · `version_id` · `section_key` · `span_start` · `span_end` (character offsets into that section's content) · `severity` (violation | attention | pass) · `kind` (structural | consistency | substantive) · `actionable` (boolean) · `title` · `explanation` · `created_at`. Citations to the governing rule are linked via the existing `citations` table.

**`applicable_rules`** — a rule that governs this project now or may govern it later.
`id` · `project_id` · `version_id` · `section_number` · `cfr_ref` (nullable) · `status` (applies_now | conditional) · `trigger` (nullable, the scenario for conditional rules) · `actionable` (boolean) · `note` · `created_at`.

**`prior_art_matches`** — a similar public patent for a project.
`id` · `project_id` · `version_id` · `patent_number` · `title` · `source` (google_patents | uspto_odp) · `source_url` · `overall_score` · `created_at`.

**`match_spans`** — the pinpoint overlaps inside one match. This is what makes the score defensible.
`id` · `match_id` · `user_section_key` · `user_span_start` · `user_span_end` · `patent_span_text` · `overlap_type` (lexical | semantic | claim_limitation) · `element_confidence`.

**`audit_log`** — append-only, detailed. Every meaningful action.
`id` · `user_id` · `project_id` (nullable) · `version_id` (nullable) · `action` (e.g. section_edited, version_saved, version_restored, findings_run, prior_art_searched, rule_surfaced, export_generated, login) · `detail` (JSON: what changed, old/new where relevant) · `ip` · `created_at`.

**`exports`** — a record of every generated export, for the audit trail.
`id` · `user_id` · `project_id` · `version_id` · `format` (pdf | txt) · `created_at`.

Carried from v1 unchanged: the MPEP corpus tables and the answer/citation tables, reused so that findings and surfaced rules ride the same citation-validation path that already kills hallucinated section numbers.

---

## 4. The engines

Six engines do the work. Each is specified below in enough detail to build and test in isolation.

### 4.1 Structured intake — the draft as data

The user enters their patent into **discrete fields that mirror the actual anatomy of an application** (37 C.F.R. 1.77 ordering; 35 U.S.C. 112 requirements), not one free-text blob. Each field is its own editor with its own validators:

- **Title of the invention** — short technical title.
- **Cross-reference to related applications** — any provisional or parent being claimed.
- **Statement on federally sponsored R&D** — present or "not applicable."
- **Background** — field of the invention and description of related art.
- **Brief summary** — high-level statement of the invention.
- **Brief description of the several views of the drawing** — one line per figure.
- **Detailed description** — the body; where reference numerals are introduced.
- **Claims** — entered as discrete, numbered claim rows, each parsed into preamble / transitional phrase / body.
- **Abstract** — single paragraph, word-counted live against the 150-word ceiling.
- **Drawings metadata** — figure list, and for each figure the reference numerals it shows (image upload and true image analysis are a later phase; see 4.6).
- **Office action** (only when the user marks the project as having received one) — pasted text of the examiner's action, for the response-stage features.

Storing the draft as typed, separated sections is what makes everything downstream possible: stage detection reads which sections exist, the validator reads across sections to find contradictions, and prior-art search reads the claims and description specifically.

### 4.2 Stage detection

Pincite infers the stage from **what is filled in and how complete it is**, plus any status the user has explicitly declared (filed, office action received). It is a transparent rules engine — the user can always see *why* it placed them at a stage — not a black box.

| Detected stage | Primary signal |
|---|---|
| **Choosing a type** | No substantive sections yet, or only the intake questionnaire answered |
| **Provisional drafting** | Spec sections + drawings present, **no claims, no oath**, type/intent provisional |
| **Specification drafting** | Title/background/summary/detailed description being filled; claims sparse or absent |
| **Claims drafting** | Spec substantially present; claims being entered or revised |
| **Pre-filing review** | All required parts present and the user requests a completeness pass |
| **Filed — awaiting examination** | User marks filed; application number and filing date entered |
| **Published** | Filing date + 18 months elapsed, or user marks published |
| **Office action response** | User marks office action received and pastes its text |
| **After final / RCE / appeal** | Office action text indicates a final rejection |
| **Allowed → issue** | User marks a notice of allowance received |
| **Granted → maintenance** | User marks granted; issue date entered |

Each stage drives which rules get surfaced (4.4) and which validators are relevant (4.3). Crucially, the engine also reports **what is missing to reach the next stage**, which is where the "what you still need to do" requirement is met.

### 4.3 The validator — finding errors

This is the heart of the review. It runs in **three tiers, cheapest and most certain first**, so the confident, deterministic checks never depend on the model and the model is reserved for genuinely judgmental calls (clearly labeled as such).

**Tier 1 — Structural / format checks (deterministic, no model).** Fast, cheap, and either true or not. Each produces a finding with a hard citation. A representative (not exhaustive) set:

| Check | Pinned to | Severity | Actionable? |
|---|---|---|---|
| Title length over 500 characters | 37 CFR 1.72(a); MPEP 606 | Red | Yes |
| Abstract over 150 words | 37 CFR 1.72(b); MPEP 608.01(b) | Red | Yes |
| Abstract not a single paragraph, or uses "means" / legal phraseology | MPEP 608.01(b) | Yellow | Yes |
| A claim that is not a single sentence (no terminal period, or multiple) | 37 CFR 1.75; MPEP 608.01(m) | Red | Yes |
| Claims not numbered consecutively in Arabic numerals | 37 CFR 1.126 | Red | Yes |
| A dependent claim that does not refer to a preceding claim, or appears to broaden it | 37 CFR 1.75(c); MPEP 608.01(n) | Red | Yes |
| A multiple-dependent claim depending on another multiple-dependent claim, or not stated in the alternative | 35 USC 112(e); 37 CFR 1.75(c); MPEP 608.01(n) | Red | Yes |
| No recognized transitional phrase in a claim | MPEP 2111.03 | Yellow | Yes |
| A figure referenced in the text but absent from the brief description of drawings (or vice versa) | 37 CFR 1.74; MPEP 608.01(f) | Red | Yes |
| A reference numeral in the drawings not mentioned in the description, or vice versa | MPEP 608.01(g), 608.02 | Yellow | Yes |
| More than 3 independent or more than 20 total claims | 37 CFR 1.16(h), (i) | Yellow | **No — informational** (excess-claim fee paid to the USPTO) |
| Any multiple-dependent claim present | 37 CFR 1.16(j) | Yellow | **No — informational** (fee) |

The last two rows are the model for the actionable/informational split: Pincite states the fee consequence and pins it, but gives the user nothing to "do" in-app, because that money goes to the Office.

**Tier 2 — Consistency / cross-reference checks (deterministic parse + model assist).** These read *across* sections, which is where "this does not align with what you said before" comes from:

- **Antecedent basis.** Every "the X" / "said X" in a claim must have a prior "a X" / "an X" in that claim or its parent. A missing introduction is flagged as a likely indefiniteness problem under 35 U.S.C. 112(b) — MPEP 2173.05(e).
- **Reference-numeral integrity.** Build the set of numerals from the detailed description, the claims, and the drawings metadata and reconcile them. The same numeral must denote the same element everywhere; a numeral used for two different parts, or a part given two numerals, is flagged — MPEP 608.01(g), 608.02.
- **Terminology consistency.** The same feature should carry the same name throughout. "Reservoir" in the spec and "tank" in a claim for the same numbered element is flagged for reconciliation (a frequent source of 112 problems).
- **Claim-to-spec support.** Each claim limitation should find support in the detailed description. A limitation with no basis in the written description is flagged under 35 U.S.C. 112(a) — MPEP 2161, 2163 — as a possible written-description/enablement gap.
- **New matter** (relevant once a project is post-filing and being edited). Content added after the filing snapshot that is not supported by the original disclosure is flagged under 35 U.S.C. 132 — MPEP 608.04 — because it cannot be added by amendment.
- **Means-plus-function structure.** Detect "means for [function]" and nonce-word equivalents ("module/mechanism/unit/element for [function]" — the *Williamson* line of cases). For each, check the specification discloses **corresponding structure**. A means-plus-function limitation with no structure in the spec is flagged as indefinite under 35 U.S.C. 112(b)/(f) — MPEP 2181–2183.

**Tier 3 — Substantive flags (model + retrieval, lower confidence, always labeled "verify").** These are genuinely judgmental and the UI marks them as the model's read, not a rule mechanically broken:

- **Subject-matter eligibility (§101).** Surface claims that look directed to a judicial exception (an abstract idea, law of nature, or natural phenomenon) and walk the user through the *Alice/Mayo* framework as the USPTO applies it — Step 1, Step 2A prongs one and two, Step 2B — MPEP 2106. Pincite presents the framework and where the claim sits in it; it does **not** pronounce the claim ineligible.
- **Indefinite relative terms (§112(b)).** Flag "about," "substantially," "approximately," "high/low," "effective amount," and similar where the spec gives no standard for measuring them — MPEP 2173.05(b). Yellow, because these are sometimes fine and sometimes fatal.
- **Possible novelty/obviousness exposure (§§102/103).** Driven by the prior-art engine (4.6): where a found patent's language reads on a claim limitation, the finding links straight into the split-screen evidence pane.

Every finding, whatever tier, stores: the **exact span** in the user's text (offsets, so the UI can underline it in place), a **severity color**, the **actionable/informational** flag, a **plain-English explanation**, the **pinned citation** (validated against the corpus before display, exactly as v1 does), and a **verify flag** for Tier 3 and anything time-sensitive.

### 4.4 Rule surfacing — what applies now, and what *may* apply next

Two lists, always distinguishable by color and label.

**Applies now (green).** Given the patent type and detected stage, the rules that govern the work in front of the user, each pinned. Example, claims-drafting stage: 37 C.F.R. 1.75 and MPEP 608.01(m)/(n) (claim form and dependency), MPEP 2111.03 (transitional phrases), MPEP 2173 (definiteness), MPEP 2181 (means-plus-function), and the §112(a) support requirements in MPEP 2161/2163.

**May apply next (yellow), with the triggering scenario.** This is the requirement that *"sometimes you won't know what rule applies until they fill it in, and in that case you give the possible rules and explain the scenario."* Pincite runs a small decision tree over the draft and the planned next steps and emits conditional rules, each stating the **"if"** plainly. Worked examples it should produce:

- *If you add a fourth independent claim or a twenty-first total claim,* excess-claim fees apply under 37 C.F.R. 1.16(h)/(i). *(Informational — fee.)*
- *If you use "means for" language,* §112(f) is invoked and you must disclose corresponding structure in the specification or the limitation is indefinite — MPEP 2181.
- *If you claim the benefit of a provisional,* 35 U.S.C. 119(e) and 37 C.F.R. 1.78 require filing within twelve months of the provisional, at least one common inventor, and full §112 support in the provisional for anything you claim priority to.
- *If you intend to file abroad,* a foreign filing license under 35 U.S.C. 184 is required before exporting the unpublished technical subject matter, or you must wait six months from the US filing — MPEP 140. *(This is also why the app stays on US infrastructure.)*
- *If the invention was publicly disclosed,* the one-year grace period of 35 U.S.C. 102(b)(1) starts running and a US filing must precede its expiry.
- *If you add new matter to a continuation,* it must be filed as a continuation-in-part, and the new matter gets the later effective date — MPEP 201.
- *If an office action issues,* a shortened statutory period (commonly three months) runs, extendable up to six months for escalating fees under 37 C.F.R. 1.136(a). *(The deadline is a fact to calendar; the extension fee is informational.)*
- *If the examiner issues a restriction requirement,* you must elect one invention to prosecute now and may pursue the others in divisional applications — 35 U.S.C. 121; MPEP 803.

The conditional engine is deliberately the place where the tool earns trust on the *forward-looking* side: it tells a junior practitioner what is coming before they step in it.

### 4.5 MPEP locate → load → highlight

The corpus is large and must **not** be poured into the model on every request. The flow is three explicit steps, matching the *"find the relevant part first, then load the full page and highlight what applies"* requirement:

1. **Locate (the fast "grok" step).** Given a finding or a question, identify the responsive section(s) *without* loading the whole manual. Run a hybrid lookup: a keyword/section-number index for exact hits, plus the v1 pgvector semantic search over chunks for conceptual ones, then a cheap fast-model pass (a small Claude model) to pick the best section from the shortlist. *Note on "grok": this is the locate step. The reference stack keeps everything on Claude for one confidentiality boundary; if you specifically want to swap in xAI's Grok or another model for locate, you can, but any model that sees invention text inherits the Phase 0 confidentiality terms — vet it the same way.*
2. **Load.** Pull the **full text** of the chosen section from `mpep_sections` (already ingested in v1). No live scraping of USPTO systems at request time — the corpus is the local, versioned copy.
3. **Highlight.** Have the model return the responsive portion as anchor quotes or character offsets *into the stored section text*. The frontend renders the full section in the right half of the evidence pane and wraps those offsets in a yellow highlight, leaving the rest readable for context.

Storing offsets against the canonical section text (rather than re-finding text on the client) keeps highlights stable and is what makes the "open the rule and see exactly the sentence that bites" experience reliable.

### 4.6 Prior-art similarity — with pinpoint overlaps, not just a number

A bare similarity score is close to useless and easy to distrust. Pincite's output is **the highlighted exact overlaps**; the number is a summary of them, never the headline.

**Pipeline:**

1. **Feature extraction.** Parse the claims into individual limitations. Extract the key technical noun phrases and functional language from the claims and detailed description. Predict (or take from the user) the relevant CPC classification(s) to scope the search.
2. **Query — politely, per search, never bulk.** Hit **Google Patents on BigQuery** (the `patents-public-data` public dataset) and/or the **USPTO Open Data Portal** at data.uspto.gov for candidates in-class. One query per search; no bulk download of live systems — carried straight from the v1 guardrails.
3. **Candidate ranking.** Embed the user's claims/description and compare against embedded candidate claims and abstracts (cosine), combined with CPC overlap, to rank candidates.
4. **Pinpoint matching — the differentiator.** For each top candidate, align the user's claim limitations against the candidate's claims and specification and compute **element-level overlap**: which specific limitation appears to be disclosed by which specific passage. Store each overlap as a `match_span` with its type (lexical exact, semantic, or claim-limitation) and a confidence.
5. **Score, honestly.** The `overall_score` is a transparent composite of semantic similarity, fraction of limitations with a strong overlap, and CPC overlap. The UI shows the score **and** the underlying spans, and labels what the score is built from. The number is never presented as a verdict.

**In the evidence pane:** the user's element on the left, the candidate patent on the right with overlapping passages in yellow and a **red marker** where a passage appears to read on an entire limitation (a possible anticipation worth real scrutiny). A standing line states this is a research signal to verify, not a validity or freedom-to-operate opinion.

**Drawings.** True image-similarity over figures is hard and is a later phase (figure embeddings / computer vision). In the first cut, "drawing similarity" is approximated from the **figure descriptions and the CPC classification**, and labeled as such so no one mistakes it for visual matching. Be honest about the limit rather than implying capability that is not there.

**Confidentiality note that rides on this engine:** steps 1 and 3 send the user's claim/description text to whatever embedding service you choose. This is the concrete decision point flagged in 0.1 — either the embedding vendor is under the same US-region, zero-retention terms as the generation model, or you run an open embedding model on your own US infrastructure so the invention text never leaves your boundary. Decide before this engine ships.

---

## 5. Screens

- **Dashboard.** The home surface. A card per project showing name, patent type, detected stage, completeness percent, count of open red findings, last-edited date, and number of saved versions. Entry points to open, branch, or start a project. (Detailed in 8.)
- **Project workspace.** The structured intake (4.1) down the left as editable sections, a live findings rail, and the surfaced-rules lists. Editing any section autosaves a working draft and re-runs the relevant validators. This is where most time is spent.
- **Evidence pane.** The half-screen split (2.2), opened from any finding, rule, or prior-art match.
- **Stage view.** A plain readout of the detected stage, *why* it was detected, and what is still missing to advance — the "what you need to do next" surface.
- **Type comparison.** From v1: a clean table comparing utility, design, and plant patents across cost, term, scope, and controlling chapter, fed by the cited corpus.
- **Prior-art results.** The ranked candidate list with scores; each opens the evidence pane to its pinpoint overlaps.
- **Version history.** The list of saves for a project, dated and labeled, with restore-into-a-new-save and branch (8).
- **Audit log viewer.** A read-only, filterable view of the project's action history (8).
- **Ask.** The original v1 single-box cited Q&A, still available for free-standing procedure questions, now also able to attach to the open project for context.
- **Export.** Generate the review report as PDF or TXT (9).

---

## 6. Roadmap

Phases are ordered. **Do not start a phase until the previous one passes its done test**, and **every feature inside a phase must pass the verification gate in §7 before it is considered finished.** This supersedes the v1 roadmap and folds the v1 work into Phases 0–2.

### Phase 0 — Foundation and the confidentiality baseline

**Goal.** A deployed, logged-in shell that is *safe to put invention text into*, with the dashboard skeleton.

**Build steps.**
1. Scaffold Next.js (App Router) + React + TypeScript; add shadcn + Tailwind; configure the strict color tokens from §2.1 as the only palette.
2. Stand up Supabase (Postgres + pgvector, Auth, Storage), **all in a US region**, and confirm every region setting is US.
3. Wire email auth; enforce per-user row-level security so a user can only ever read their own rows; write a test that proves cross-user reads fail.
4. Configure the Anthropic API client for **zero-data-retention** and confirm in writing the no-training posture; record the same for any other vendor that will see text.
5. Verify encryption at rest (database, storage) and TLS in transit.
6. Build the empty dashboard shell and the intake consent/warning screen (the standing confidentiality notice from 0.1).
7. Create the `audit_log` table and log login/logout from day one.

**Verification gate (§7) plus phase-specific checks:** screenshot the login, empty dashboard, and consent screen; zero console errors on each; confirm via the network panel that all calls hit US-region endpoints; run and pass the cross-user isolation test.

**Done when.** You can sign up, log in, and reach an empty dashboard on the live URL; the cross-user read test passes; every data and model endpoint is confirmed US-region with zero retention; login events appear in the audit log.

### Phase 1 — Structured intake, projects, versioning, audit

**Goal.** A user can create a project, fill in the patent section by section, and every save is a dated, restorable version with a full audit trail.

**Build steps.**
1. Implement `projects` and `project_sections`; build the project workspace with the §4.1 fields, each as its own editor (claims as discrete numbered rows parsed into preamble/transition/body).
2. Autosave the working draft on edit; debounce; show a saved indicator.
3. Implement **save-as-new-version**: writing `project_versions` as an immutable snapshot, never overwriting; capture a label and timestamp.
4. Implement restore (open an old version into a *new* save, never destroying history) and branching via `parent_version_id`.
5. Log every meaningful action to `audit_log` (section edited with old/new, version saved, version restored), with timestamps.
6. Build the dashboard cards (name, type, stage placeholder, completeness, last edited, version count) and the version-history list.

**Verification gate plus phase-specific checks:** screenshot intake with content, a save creating a new version, the version list with dates, and a restore producing a new save; zero console errors; confirm in the database that a save appends a row and never overwrites, and that the audit log captured each action.

**Done when.** A user can fill in all sections, save repeatedly, see each save dated in version history, restore an old one into a new save without losing history, and see every action in the audit log.

### Phase 2 — MPEP corpus, locate-load-highlight, the evidence pane

**Goal.** The cited-answer core and the half-screen evidence pane with yellow MPEP highlighting.

**Build steps.**
1. Ingest the full MPEP into `mpep_sections` / `mpep_chunks` (the v1 pipeline: fetch chapters, split by section number, store full sections with edition + source URL, chunk, embed, record edition date). Use the recorded edition for the versioning/staleness handling.
2. Build the keyword/section-number index alongside the existing vector search for the **locate** step (4.5).
3. Implement load (full section from the corpus) and highlight (model returns offsets into the stored section text).
4. Build the **evidence pane** (2.2): half-screen split, full section on the right, responsive span highlighted in yellow, context preserved.
5. Re-confirm citation validation: every section number checked against `mpep_sections`; unresolved cites dropped and the answer marked for review, exactly as v1.

**Verification gate plus phase-specific checks:** screenshot the evidence pane open with a correctly highlighted section; zero console errors; confirm a known procedure question opens the right section with the right portion highlighted, and that a deliberately corrupted/fake section number is dropped before display.

**Done when.** Asking a known procedure question, or opening a rule, slides in the evidence pane with the full correct MPEP section and the applicable portion in yellow; no invented section number ever reaches the screen.

### Phase 3 — Stage detection

**Goal.** The app tells the user what stage they are at, why, and what is missing to advance.

**Build steps.**
1. Implement the transparent rules engine (4.2) over which sections exist, their completeness, and declared status flags (filed / office action / allowed / granted), with the corresponding inputs for those flags (application number, filing date, office action text, issue date).
2. Build the stage view: the detected stage, the signals that produced it, and the gap to the next stage.
3. Surface the detected stage on the dashboard card.

**Verification gate plus phase-specific checks:** screenshot the stage view at three different fill levels (e.g. spec-only, spec+claims, marked-filed) each showing the right stage and the right "what's missing"; zero console errors; confirm changing inputs moves the stage correctly.

**Done when.** Filling in different combinations of sections and status flags lands the user on the correct stage with a correct explanation and a correct list of what is still needed.

### Phase 4 — Validator, Tier 1 (structural) and the findings rail

**Goal.** Deterministic format checks produce colored, pinned, actionable-or-informational findings on the user's own draft.

**Build steps.**
1. Implement the Tier 1 checks (4.3 table): title length, abstract length/form, claim single-sentence, claim numbering, dependent/multiple-dependent form, transitional phrase, figure/description reconciliation, reference-numeral mention, claim-count fee notices.
2. Write findings to `findings` with exact spans, severity color, kind, the actionable/informational flag, and a pinned citation routed through the validation path.
3. Build the findings rail and the in-place underlining of flagged spans (red for violation, yellow for attention), with text labels alongside color for accessibility.
4. Wire each finding to open the evidence pane on its pinned rule.

**Verification gate plus phase-specific checks:** screenshot a draft with seeded violations showing red underlines and the findings rail, and an informational fee finding styled distinctly from an actionable one; zero console errors; confirm each finding opens the correct MPEP/CFR section; confirm no informational finding exposes an input.

**Done when.** A draft with known format problems lights up the right spans in the right colors with correct pins, fee items are clearly informational with nothing to "do," and every finding opens to its rule.

### Phase 5 — Validator, Tier 2 (consistency) and Tier 3 (substantive)

**Goal.** Cross-section contradiction detection plus clearly-labeled judgmental flags.

**Build steps.**
1. Implement Tier 2: antecedent basis, reference-numeral integrity, terminology consistency, claim-to-spec support, new-matter (post-filing), means-plus-function structure (4.3).
2. Implement Tier 3 with explicit "verify" labeling: §101 framework walkthrough, indefinite relative terms, and the hook into prior-art-driven §102/§103 flags.
3. Ensure every Tier 2/3 finding still carries an exact span, a pin, and the verify flag; Tier 3 is visibly marked as the model's read, not a mechanical rule break.

**Verification gate plus phase-specific checks:** screenshot a draft with a seeded antecedent-basis gap, a numeral mismatch, and a means-plus-function term lacking structure, each flagged and pinned; screenshot a Tier 3 §112(b) relative-term flag carrying a visible verify label; zero console errors; confirm Tier 3 items are never styled as hard violations.

**Done when.** Contradictions across sections are caught and pinned, judgmental flags are present but unmistakably labeled for human verification, and the severity colors match the certainty.

### Phase 6 — Rule surfacing, now and conditional

**Goal.** The two rule lists — applies-now (green) and may-apply-next (yellow, with the scenario).

**Build steps.**
1. Implement the applies-now list keyed to type + stage, each rule pinned (4.4).
2. Implement the conditional decision tree producing "if X then rule Y" items with the trigger spelled out and the actionable/informational flag set (4.4 worked examples).
3. Render both lists in the workspace with the color/label discipline; each rule opens the evidence pane.

**Verification gate plus phase-specific checks:** screenshot the workspace showing applies-now rules in green and at least three conditional rules in yellow with their triggers; zero console errors; confirm a conditional rule's stated trigger actually fires the predicted rule when the user takes that action (e.g. adding a "means for" limitation surfaces §112(f)).

**Done when.** A user sees the rules governing their current stage and a correct set of conditional future rules with clear triggers, all pinned and openable, with fee/deadline items correctly informational.

### Phase 7 — Prior-art similarity with pinpoint overlaps

**Goal.** Find similar public patents and show the exact overlapping language in the evidence pane.

**Build steps.**
1. Implement feature/limitation extraction and CPC scoping (4.6).
2. Integrate Google Patents on BigQuery and/or the USPTO Open Data Portal, one query per search, no bulk download.
3. Implement candidate ranking, then element-level pinpoint matching into `match_spans`, then the transparent composite score.
4. Build the results list and wire each match into the evidence pane with yellow overlap highlights and red full-limitation markers.
5. Resolve and implement the embedding confidentiality decision from 0.1/4.6 before enabling on real invention text.

**Verification gate plus phase-specific checks:** screenshot the results list with scores and the evidence pane showing highlighted overlaps for a known-similar reference; zero console errors; confirm the spans correspond to real overlapping text and that the standing "not a validity/FTO opinion" line is present; confirm the embedding path honors the confidentiality decision.

**Done when.** A user runs a search, gets ranked public patents, and can open any match to see the exact overlapping passages highlighted with an honest, decomposable score — and the invention text only ever went where the confidentiality decision allows.

### Phase 8 — Export (PDF and TXT)

**Goal.** The whole review exports as a clean PDF or TXT the user can keep and build from.

**Build steps.**
1. Define the export document: project metadata (name, type, detected stage, version label, date), the draft sections, the findings grouped by severity with pins, the applies-now and conditional rules, and the prior-art matches with their overlaps summarized.
2. Implement server-side PDF rendering (print-CSS to a headless renderer, or a PDF component library) and a plain-text serializer for TXT, both US-region.
3. Record every export in `exports` and the audit log.
4. Add export buttons on the workspace and the version-history view.

**Verification gate plus phase-specific checks:** screenshot a generated PDF first page and the TXT output; zero console errors during generation; confirm the PDF is legible in grayscale (so the color-coding survives print) and that the export logged to the audit trail.

**Done when.** A user exports a complete, readable review as PDF and as TXT, with citations intact and the color-coding legible in print, and the export appears in the audit log.

### Phase 9 — Polish, accessibility, history and audit viewers

**Goal.** The version-history and audit-log surfaces, accessibility hardening, and performance.

**Build steps.**
1. Build the full version-history UI (dated saves, labels, restore-into-new-save, branch) and the read-only filterable audit-log viewer.
2. Accessibility pass: AA contrast everywhere, non-color signals on every colored item, keyboard navigation, screen-reader labels on findings and highlights.
3. Performance: cache located sections, debounce validator runs, lazy-load the corpus pages.

**Verification gate plus phase-specific checks:** screenshot the version-history and audit-log viewers; run an accessibility check (e.g. axe) with zero critical issues; zero console errors; confirm grayscale legibility once more.

**Done when.** History and audit are fully navigable, the accessibility check is clean, and the app stays responsive on a realistic project.

### Later

Figure image-similarity via computer vision; office-action triage on public documents (identify rejection types, point to the response sections); small-team sharing and roles; saved searches and search history. Each is fine to add once the core has earned it.

---

## 7. The verification protocol — run after every feature

This is the loop the user requires: **after implementing each feature, take a screenshot, check the console for errors with Chrome DevTools, and only move on when everything passes.** Define it once; every phase above references it.

**For each feature, before it is marked done:**

1. **Run the app** — the local dev server, or the deployed preview.
2. **Drive the feature to its exact state** with a headless browser (Playwright, or a Chrome DevTools MCP server) so the check is reproducible, not a manual click-through.
3. **Capture a screenshot** to `/screenshots/phase-<n>-<feature>.png`. Compare it against the spec for that feature: correct layout, and **correct use of the §2.1 color system** (red only on violations, yellow only on highlights/conditionals, green only on applies-and-passes).
4. **Capture console output** — subscribe to console messages and page errors (in Playwright, `page.on('console', …)` and `page.on('pageerror', …)`; via the DevTools protocol, the equivalent Runtime/Log events). Collect every error and warning.
5. **Capture failed network requests** for the feature's calls (4xx/5xx, and confirm endpoints are US-region where invention text is involved).
6. **Apply the gate.** The feature passes only if: **zero console errors, zero unhandled page exceptions, no failed network requests on the feature path, and the screenshot matches the spec including colors.** Console warnings are triaged — benign ones noted, anything suspicious resolved.
7. **If anything fails, fix it and re-run from step 1.** Do not advance to the next feature or phase with a red gate.

A reusable console-capture sketch the implementation can build on:

```ts
const errors: string[] = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(url);
// ...drive the feature to its state...
await page.screenshot({ path: `screenshots/phase-${n}-${feature}.png`, fullPage: true });
if (errors.length) throw new Error(`Gate failed:\n${errors.join('\n')}`);
```

Keep the screenshots and a short pass/fail note per feature in the repo, so the verification history is itself auditable.

---

## 8. Sessions, versioning, audit, and the dashboard

**Sessions are projects, and saving is append-only.** A "session" is a `projects` row the user returns to. Editing autosaves a working draft so nothing is lost between visits. **Saving creates a new immutable `project_versions` snapshot** — it never overwrites a prior save. This is what lets the user "save it as another save" and come back: every save is preserved, dated, and labeled.

**Version history** lists every save for a project with its date and label. The user can **restore** any version — which opens it as a *new* save rather than deleting newer ones — and can **branch** from any version via `parent_version_id` to explore an alternative without disturbing the main line.

**Audit logs are detailed and append-only.** Every meaningful action lands in `audit_log` with a timestamp and the specifics: which section changed and its before/after, when a version was saved or restored, when findings were run, when a prior-art search ran, when an export was generated, and logins. The audit-log viewer is read-only and filterable. This both satisfies the user's requirement and reinforces the product's posture: a reviewable, accountable record is exactly what a practitioner relying on a tool wants to be able to produce.

**The dashboard** is the home surface: a card per project showing name, patent type, **detected stage**, completeness percent, count of open red findings, last-edited date, and number of saved versions — with actions to open, restore, branch, or start fresh. It is the at-a-glance "here is everything I have in progress" view.

---

## 9. Export, twice over

**The tool's export.** Phase 8 produces the review report — draft, findings (grouped by severity, pinned), applies-now and conditional rules, and prior-art overlaps — as **PDF or TXT**, recorded in the audit trail, legible in grayscale so the color-coding survives print.

**This document's export.** The build plan itself is delivered as Markdown (the format to actually build from and edit), as a **PDF** (the polished read), and as **TXT** (the plain-text fallback) — so it can be exported and built off exactly as requested.

---

## 10. Legal and confidentiality posture (expanded from v1)

Everything v1 committed to still holds, plus the additions that handling invention text demands:

- **Answer only from retrieved primary text; never freehand a rule.** Findings and surfaced rules ride the same citation-validation path; unresolved cites are dropped.
- **Cite every assertion and validate it against the corpus** before display.
- **Flag time-sensitive items for human verification**; mark Tier 3 substantive flags as the model's read, not a verdict.
- **Keep the actionable/informational wall** — never ask the user to input a fee or do the Office's job.
- **US infrastructure end to end; zero-retention model and embedding calls; encryption; per-user isolation** — the Phase 0 baseline, which is also the concrete answer to the foreign-filing-license exposure on unpublished disclosures and the confidentiality duty.
- **Use public APIs politely; one query per search; no bulk scraping** of live USPTO systems.
- **A human stays in the loop by design,** because the USPTO treats blind reliance on an AI tool as a failure of reasonable inquiry. The product supports the inquiry; it does not replace it.
- **Version the corpus and show the edition** in the interface; re-ingest on each new MPEP revision so staleness is visible, not silent.

---

## 11. Risks

- **Hallucinated citations** — the worst failure for a legal tool. Mitigated by answering only from retrieved text and validating every section number against the corpus before it is shown, on findings and surfaced rules alike.
- **Over-trust of the similarity score** — a number invites being read as a verdict. Mitigated by leading with the highlighted spans, decomposing the score, and a standing "research signal, not a validity or FTO opinion" line.
- **Drift toward legal advice** — a review tool can be misread as counsel. Mitigated by the cited-research framing, the hard line against drafting or filing, the verify labels, and the human-in-the-loop design.
- **Confidential-data exposure** — now the central risk, because the product ingests invention text. Mitigated by the Phase 0 controls (US-region, zero-retention, encryption, isolation, consent) and the explicit embedding-vendor decision; the review features stay dark until those are real.
- **Stale MPEP** — the manual is revised. Mitigated by versioning the corpus, recording and showing the edition, and re-ingesting on each revision.
- **Foreign-filing-license trip** — routing unpublished US-origin technical subject matter abroad. Mitigated structurally by keeping all processing US-region and by the conditional rule that warns the user before they file abroad.
- **Adoption** — a narrow tool must be excellent at its one job. Mitigated by making the intake-plus-findings loop fast and trustworthy before anything else is added.

---

## 12. Open decisions to make before building

- **Embedding path:** vetted third-party vendor under zero-retention US terms, or self-hosted open embedding model on your own US infrastructure? (Confidentiality vs. quality/effort.) Decide before Phases 4–7.
- **"Grok" for locate:** keep everything on Claude for a single confidentiality boundary, or introduce a second model for the locate step and extend the Phase 0 terms to it?
- **Drawings:** ship the description/CPC proxy first and add image-similarity later, or invest in computer vision earlier? (Recommended: proxy first, labeled honestly.)
- **Office-action features:** public-document triage only, in line with the public-data discipline, until the controls and demand justify more.
- **Name:** confirm "Pincite" trademark and domain availability, or pick the real name now to avoid rework.

---

*This is a build plan and a legal-research-aid specification, not legal advice. Section and rule references (35 U.S.C., 37 C.F.R., MPEP) are the relevant provisions as of the current MPEP edition; the tool validates each pin against its ingested corpus, which is the mechanism that catches any drift.*
