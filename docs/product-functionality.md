# Pincite product functionality

This is the complete functional reference for Pincite.
It covers every screen, every input, every check, and the rules that sit behind them.
For architecture and data model see `docs/architecture.md`.
For the legal and confidentiality posture see `docs/business-context.md`.

Pincite is an active patent review workbench.
A person drafts a US patent section by section, and Pincite checks what they wrote, shows the governing rule pinned to real MPEP and CFR text, finds similar public patents with pinpoint overlaps, and produces a filing ready document set they hand to the USPTO themselves.
Pincite is a research aid, not legal advice, and it never files anything for you.

The core discipline is simple.
No claim, finding, or rule reaches the screen without a citation that resolves to real corpus text.
Anything that cannot be resolved is dropped rather than shown.

---

## The two roles

A user picks a role once, right after consent, and the whole workflow adapts.

- **Inventor filing pro se.**
  This person files their own patent.
  They get plain English guidance, and they personally sign the inventor's declaration (37 CFR 1.63).
- **Patent attorney or agent.**
  This person files on behalf of clients.
  They get a denser portfolio view across clients and matters, the power of attorney path, and they sign the prosecution papers.

The role only changes the workflow and the wording you see.
It is not a security boundary.
Every user can only ever see and edit their own projects, enforced by row level security on every table.

How the two paths differ in practice:

- The attorney dashboard groups projects by client and matter and shows a denser table.
  The inventor dashboard shows a guided single project flow.
- The New project dialog shows Client and Matter fields only for attorneys.
- The Sign step centers on the inventor's own oath for a pro se filer.
  For a juristic applicant (a company), the signature path expects a registered practitioner, which the filing checks enforce.

---

## Getting in

### Sign in

The login screen offers two ways in.
You can sign in with email and password, with a link to create an account.
You can also continue with Google.
Both run through Supabase Auth, and a new account flows straight into consent and then role selection.

There is a development only login used by the automated tests.
It returns a 404 in production and is never reachable by real users.

### Consent

Before any work, you accept a standing confidentiality and not legal advice notice.
This is recorded with a timestamp and written to the audit log.

### Role selection

Right after consent you choose inventor or attorney.
You can think of this as choosing which guidance and layout you want.

---

## The dashboard

The dashboard is the home base.
Every project shows its detected stage, its completeness, the count of open red findings, and the single next step that matters.
Deadline critical steps, like an office action reply or an issue fee, are marked in the attention color so they stand out.
The sidebar is the spine of the app, and Dashboard is one click away from any screen.

You can leave any input mid way and return to the dashboard at any time without losing work, because section edits autosave.

---

## A project and the step rail

A project is one in progress patent.
Inside a project the left step rail lays out the whole flow in order, and each step turns green when it is complete.

The order is Draft, Disclosure, Inventors and ADS, Drawings, Review, Rules, Prior art, Sign, and Submission.
You do not have to do them strictly in order, but some steps depend on earlier ones, and Pincite tells you when a step cannot be done yet.

Creating a project asks for three things.

- **Name.**
  A label so you can find the project later.
  It is not the patent title.
- **Patent type.**
  Utility covers how something works or is used, which is most inventions.
  Design covers only the ornamental look of an object.
  Plant covers a new asexually reproduced plant variety.
  This choice changes which checks run, so it is hard to change later.
- **Client and Matter** (attorneys only).
  The client name and your internal matter number.

---

## Draft, the specification sections

The draft is the patent specification, entered as eleven plain text sections.
The editors are plain text, not rich text, so character offsets stay stable and findings can underline the exact span later.
Each section autosaves as you type and shows a saved indicator.
Each section carries a short plain language hint that explains what to put there and flags when it depends on earlier work.

The sections are the following.

- **Title of the invention.**
  A short specific technical name for the invention, not a brand name.
- **Cross reference to related applications.**
  Any earlier filing you are claiming priority to, or a note that none applies.
- **Federally sponsored research and development.**
  Government funding details, or a note that none applies.
- **Background.**
  The field, the problem, and why existing solutions fall short.
- **Brief summary.**
  A plain high level statement of the invention.
- **Brief description of the drawings.**
  One short line per figure.
  This depends on uploading your figures first on the Drawings step.
- **Detailed description.**
  The full enabling description, introducing each part with a reference numeral that matches the drawings.
- **Claims.**
  The legal definition of what you are protecting.
  One numbered claim per block, each a single sentence.
  Claim 1 stands alone, and a dependent claim refers back to an earlier claim and adds to it.
  Best drafted after the disclosure and detailed description so the claims are supported.
- **Abstract.**
  A single paragraph of 150 words or fewer, with a live word count toward the limit.
- **Drawings metadata.**
  The figure list and the reference numerals each figure shows.
- **Office action.**
  Hidden until you reach examination, where you paste the examiner's text so Pincite can help you respond.

Every save is an append only snapshot.
You can save a named version, restore an old version into a new save without losing history, and branch from a version.
Nothing ever overwrites earlier history.

---

## Invention disclosure

The disclosure is separate from the formal specification.
It captures the invention in plain language, the way an inventor would explain it, before it is dressed in patent prose.

The fields are technical field, problem solved, how it works, key components, advantages, alternatives and variations, and known prior solutions.
Each field has a hint that explains what to write.

The disclosure feeds cross reference checks.
Pincite flags a component you disclosed but never claimed or described, and a problem you raised that never made it into the Background.
This keeps the disclosure and the specification from drifting apart.

---

## Inventors and applicant, the ADS

This step captures the filing identity that the USPTO Application Data Sheet needs.

For each inventor you enter legal name, citizenship, residence, and mailing address.
An inventor is a person who contributed to conceiving the claimed invention, not an assistant, a funder, or a company.
Each inventor signs the declaration later, so full legal names matter.

The applicant is who is asking for the patent.
Usually that is the inventors themselves.
You check the company option only if a business owns the invention, for example through an employment assignment, and then you enter the company's legal name.

Entity status sets your USPTO fee tier.
Most individuals and very small businesses qualify as micro or small entity and pay reduced fees, and large entity is the default for bigger companies.

This data builds the PTO/AIA/14 ADS data card used in the filing package.

---

## Drawings and uploads

You can upload drawings and supporting documents as images, PDFs, or 3D models (GLB or GLTF), up to 25 MB each.
A patent has many views, so each figure is tagged with its orientation - perspective, top, front, side, and so on - and you can upload as many figures as you need.
A 3D model renders in the browser and can be turned by orientation with a toggle or by dragging, so you can inspect it from any angle. It stays local and is never sent to a model.
Files are stored in a private US region storage bucket, encrypted at rest, with per owner row level security so no other user can read them.
Uploads never go to a model unless you explicitly ask for the vision analysis below.

For an image figure you can run a drawing check.
A vision model reads the figure and returns a short description, the figure label it sees, every reference numeral it can read with its position, and any drawing problems it can spot under 37 CFR 1.84 and 1.83.
Pincite turns that into findings.
It flags a reference numeral that appears in the drawing but is not mentioned anywhere in your specification, a missing figure label, a disclosed component that does not appear, and the model's own observations.
Each located issue is marked with a red circle on the figure pointing at where it is, numbered to match the list, and pinned to a corpus-validated MPEP section.
Defects that do not sit at one spot, such as the figure being too small, in color, low in line quality, or missing a label, are flagged too and listed as whole-figure issues without a circle.
The locations are an approximate vision estimate, so they are labeled to verify rather than trust.
Because this sends the image to a model, it is restricted to public or synthetic figures until vendor zero data retention is on.

Figures collect into the drawings portion of the filing package.

---

## Review, the error checking

Review runs the validators across your draft and returns findings grouped by process area so you can triage at a glance instead of reading a wall of text.
The two areas are Claims and Specification, and there are filing readiness and consistency banners above them.

Findings use a strict three signal system, and color is never the only signal.

- Red, a solid dot, is a violation.
- Yellow, an outline dot, is attention or a conditional item.
- Green, a check, is something that applies and passes.

Each finding carries a severity, whether it is actionable or informational, the offending span, and a rule pin.
Click any finding and you land on the reasoning beside the governing rule, scrolled to the responsive passage, with the USPTO source linked.

The checks run in tiers, and they are aware of the patent type.

- **Tier 1, structure and format.**
  For a utility patent this catches a dependent claim that points at a claim that does not exist, a forward reference, a multiple dependent claim that is not in the alternative or that depends on another multiple dependent claim, and claim 1 not being independent (37 CFR 1.75 and 1.16, MPEP 608.01(n)).
  For a design patent it enforces the single claim and the prescribed ornamental design wording (37 CFR 1.153, MPEP 1503.03), and it skips the utility claim checks.
- **Tier 2, consistency.**
  This catches means plus function handling (MPEP 2181) and antecedent basis problems (MPEP 2173.05(e)).
- **Tier 3, substance.**
  This catches relative terms (MPEP 2173.05(b)) and runs the subject matter eligibility walkthrough described below.
- **Filing readiness tier.**
  This catches unsigned or undated declarations, a missing inventor, a declaration that does not match the ADS, a missing required statement, a wrong form for the applicant type, and ownership and inventorship problems such as a company listed as an inventor or an unrecorded assignment (37 CFR 1.63, 1.76, 1.27, 1.29, 3.81, and MPEP 602, 2109, 302).
- **Cross reference checks.**
  These compare the disclosure against the specification, as described above.

The subject matter eligibility walkthrough is the one review feature that uses a model.
It applies the USPTO Alice and Mayo framework (MPEP 2106) and walks the steps neutrally without deciding whether the claim is eligible.
It is labeled as the model's read and asks you to verify, and it never reaches the screen without the 2106 pin resolving in the corpus.

Every MPEP pin a finding produces is validated against the ingested corpus before display.
A pin that does not resolve is dropped and the finding is still shown.

---

## Rules, what applies now and what may apply next

The Rules step surfaces the rules that govern your project right now, and the ones that may apply soon.
Rules that apply now show in green.
Conditional rules show in yellow with the trigger that would make them apply, and they light up once the trigger is met.
Every surfaced rule is corpus validated and opens in the evidence pane.

---

## Stage and lifecycle

Pincite detects which stage your draft is in from what you have filled out, and explains why, and what is missing to advance.
You can also declare your status directly, from drafting through filed, published, office action, allowed, and granted, along with the application number and filing date once you have them.

Based on the declared status, the Stage step tells you what to do now.
This covers an office action reply and its three to six month windows and the abandonment risk, the after final options of an RCE or appeal, the non extendable issue fee, the maintenance fees, and publication.
Each lifecycle action is pinned to its CFR rule and corpus validated MPEP section.

---

## Prior art, the similar patents

This step finds public patents that overlap your claims.
It always works against your claims, so you need at least one drafted claim before either option will run, and the screen tells you so and stays disabled until your claims exist.

There are two ways to find overlaps.

- **Compare a patent.**
  You paste one patent's text, its claims work best, and Pincite lines up each of your claim limitations against the patent's wording.
  This path is free and fully local, with no external cost.
  It matches shared technical terms, with light stemming so trivial word endings like support and supporting or container and containers still line up rather than silently missing.
  If nothing overlaps, Pincite explains why rather than showing an empty result.
- **Run search.**
  This pulls candidate patents from Google's public patent data on BigQuery, ranks them, and shows the overlaps.
  Candidates are reranked by semantic similarity using legal tuned embeddings.

Results lead with the overlaps, not a verdict.
Each overlap is pinned to the patent passage and to your own claim element.
A yellow overlap is a shared passage, and a red overlap reads on a full limitation.
There is a transparent score that summarizes the overlaps, and there is deliberately no single novelty number, because one number invites over trust.

Every result links out to the patent's public page so you can read the original.

---

## Sign, the declaration

A pro se inventor completes the inventor's oath or declaration here.
This step needs inventors entered first, and it says so if none exist.

Each inventor reviews the application and checks the five statements the USPTO requires under 37 CFR 1.63.
These cover that the application was authorized, that they believe they are an original inventor, that they reviewed and understand the application, that they are aware of the duty to disclose under 37 CFR 1.56, and that they acknowledge the penalties for willful false statements under 18 U.S.C. 1001.
They then type their full legal name to record the attestation.

What Pincite records is the attestation, kept as an append only signed entry.
The legally binding signature is the one you submit to the USPTO, because Pincite never files.
The filing readiness checks described in Review run here too and flag any defect before you rely on the declaration.

---

## Report and export

The export is a real document set, not a generic PDF.

- The Report view prints to PDF and is legible in grayscale, with text labels and filled or outline markers so the color discipline survives black and white printing.
- A plain text export is available for a quick copy.
- The specification exports as a DOCX in 37 CFR 1.77 section order, with bracketed paragraph numbering and claims and the abstract each on their own page.
  Submitting a DOCX also avoids the USPTO non DOCX surcharge.
- The filing package is a ZIP that adds the ADS data card for the Patent Center web form, the inventor declaration, a transmittal, and a fee summary.

Exports carry only filing documents, never the internal analysis.
Every export is recorded in the exports table and the audit log.

---

## Audit log and version history

Every meaningful action is written to an append only audit log, and there is a filterable viewer for it.
Section saves keep a full version history, with restore into a new save and branch, and history is never overwritten.
Together these give a complete, tamper evident record of what happened and when.

---

## How the three core capabilities work, briefly

- **Error checking.**
  Deterministic tiers parse your claims and specification and produce findings, and the substantive eligibility step asks a model to walk the Alice and Mayo framework neutrally.
  Every MPEP pin is validated against the corpus before display, and unresolved pins are dropped.
- **Similar patents.**
  Your claims are split into limitations and key terms, candidates come from a pasted patent or from BigQuery, each limitation is matched to the closest patent passage with light stemming, and the result is shown as pinned overlaps with a transparent decomposed score rather than a single number.
- **Finding the relevant MPEP.**
  When a question or a finding names a section number, that exact section loads.
  Otherwise Pincite runs a semantic search over the embedded MPEP chunks, with a keyword search as the fallback, then highlights the responsive passage and scrolls to it.

---

## The citation discipline

The spine of the app is citation validation.
Every MPEP number that a check or a model produces is looked up in the ingested corpus before it is displayed.
Numbers that resolve are shown and are openable in the evidence pane.
Numbers that do not resolve are dropped.
This is the same reason prior art leads with the spans and refuses a single novelty score.

---

## Security and cost controls

- **Row level security.**
  Every table is scoped to its owner, so a user can only read and write their own rows, and uploads in storage are locked to their owner as well.
- **Per user rate limits.**
  Every paid call is throttled per user, server side, before the call is made, so no one can drive up cost by hammering an endpoint.
- **Account wide budget caps.**
  A global cap holds BigQuery search inside its monthly free tier so it effectively never bills, and a daily cap bounds the model calls.
  These fail closed, because a surprise bill is worse than brief downtime.
- **Append only history and audit.**
  Saves, versions, declarations, and the audit log are append only, so the record cannot be quietly rewritten.

---

## Confidentiality posture

Pincite stores data in a US region with encryption at rest and in transit.
Real unfiled invention text may only go to vendors that do no training and no retention, because of the confidentiality duty and the foreign filing license risk under 35 U.S.C. 184.

The embeddings vendor retention is opted out.
The generation vendor zero data retention is the last piece to enable.
Until it is on, use synthetic or non confidential text for the two features that send text to that model, which are the eligibility walkthrough and the drawing vision analysis.
The rest of the app runs on real text safely, because it is local or deterministic.

---

## What Pincite intentionally does not do

- It does not give legal advice, and it keeps a human in the loop.
- It does not file anything with the USPTO.
- It does not produce a single novelty or patentability score, by design, to avoid over trust.
- It does not analyze the artistic content of design figures beyond the component presence check, which is deferred.
