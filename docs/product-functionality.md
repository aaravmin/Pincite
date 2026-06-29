# Pincite product walkthrough

This document walks through every feature in the order it appears, so it can be turned into a demo script and then a video.
Each numbered step is one screen or feature, with what it is, what you do, what you see, and the one line that matters.

Pincite is an active patent review workbench.
A person drafts a US patent section by section, and Pincite checks what they wrote against the real rules, finds similar public patents, and produces a filing ready document set they hand to the USPTO themselves.
It is a research aid, not legal advice, and it never files anything.

The running example throughout is Apple's molded fiber food container, US 2012/0024859 A1, a public and already filed patent.
The matching screenshots live in `/screenshots` as `case-*.png`.

One idea to state up front, because it underpins everything.
No finding, rule, or citation reaches the screen unless its MPEP section resolves to real text in the ingested corpus.
Anything that cannot be resolved is dropped rather than shown.

---

## 1. Landing and sign in

The home page states what Pincite does in two lines, then sends you to the sign in screen.
You can sign in with email and password, with a link to create an account, or continue with Google.
Both run through Supabase Auth.
A development only login exists for the automated tests and is dead in production.
The takeaway is that this is a real, familiar sign in, not a demo stub.

## 2. Consent

Before any work you accept a short confidentiality and not legal advice notice.
It is recorded with a timestamp and written to the audit log.
The takeaway is that the confidentiality posture is explicit from the first screen.

## 3. Choose your role

Right after consent you pick a role, and it shapes the whole workflow.
A pro se inventor gets plain English guidance and personally signs the inventor's declaration.
A patent attorney gets a denser portfolio across clients and matters and the power of attorney path.
The role only changes guidance and layout, never what data you can see, because row level security scopes every table to its owner.
The takeaway is that one product serves both the solo inventor and the firm.

## 4. The dashboard

The dashboard is the home base, and the sidebar is the spine of the app.
Each project shows its detected stage, how complete it is, the count of open red issues, and the single next step that matters, with deadline critical steps marked in attention.
An attorney sees a denser table grouped by client; a pro se inventor sees a guided list.
See `screenshots/case-dashboard.png`.
The takeaway is that you always know the one next thing to do.

## 5. Start a project

A project is one in progress patent.
Creating one asks for a name, a patent type, and, for attorneys, a client and matter number.
Patent type matters because it changes which checks run; utility covers how something works, design covers only the ornamental look, and plant covers a new plant variety.
The takeaway is that the type you pick drives the rest of the review.

## 6. Draft the specification

The draft is the patent specification, entered as eleven plain text sections such as title, background, detailed description, claims, and abstract.
Each section autosaves as you type, shows a saved indicator, and carries a short hint on what to put there.
Every save is an append only snapshot, so you can save named versions, restore an old one into a new save without losing history, and branch.
The takeaway is structured drafting with full, immutable version history.

## 7. Invention disclosure

The disclosure captures the invention in plain language, the way an inventor would explain it, separate from the formal specification.
It records the problem, how it works, the key components, advantages, alternatives, and known prior art.
Pincite cross references it against the draft and flags drift, like a component you disclosed but never claimed or described.
On the Apple example it catches a carrying handle that was disclosed but never described.
See `screenshots/case-disclosure.png`.
The takeaway is that the plain language story and the legal draft are kept in sync.

## 8. Inventors and the application data sheet

Here you name every inventor and say who owns the invention.
For each inventor you enter legal name, citizenship, residence, and mailing address, and you set the applicant and the fee entity status.
Apple is the applicant in the example, a company, so the ownership rules apply, and Pincite assembles the ADS data card the USPTO needs and checks it for defects.
See `screenshots/case-inventors.png`.
The takeaway is that the filing identity is captured cleanly and checked, not left to a form at the end.

## 9. Drawings, multiple views, and 3D

You upload figures as images or PDFs, or a 3D model in GLB or GLTF, all stored encrypted in a private US region bucket scoped to you.
A patent has many views, so each figure is tagged with its orientation, perspective, top, front, side, and so on, you upload as many as you need, and you flip between them in one navigator.
The USPTO files 2D drawings, so the images and PDFs are what go in the package.
A 3D model is a visualization aid, not a filed document; it renders in the browser and turns by orientation with a toggle or by dragging, and it never leaves your account or goes to a model.
The web 3D format is glTF, so a CAD file is exported to GLB or GLTF first.
On an image figure you run the drawing check, which reads the figure for defects under 37 CFR 1.84 and 1.83.
It circles in red, on the figure, each reference numeral that appears in the drawing but was never introduced in the specification, numbered to a findings list and pinned to the rule.
Defects with no single location, like a missing figure label, a drawing that is too small, or color where line art is required, are listed without a circle and tagged as whole figure.
The circle positions are an approximate vision estimate, labeled to verify.
See `screenshots/case-drawing.png` and `screenshots/case-3d.png`.
The takeaway is that the drawings are reviewed and viewable, in 2D and 3D, not just attached.

## 10. Review, the error checking

Review runs the validators across the draft and returns findings grouped by area, Claims and Specification, as a scannable list rather than a wall of text.
The findings use a strict three signal system where red is a violation, yellow is attention, and green passes, and every colored item also carries a label and a shape so color is never the only signal.
The checks run in tiers and are aware of the patent type: structure and format, consistency, substance including the Alice and Mayo eligibility walkthrough, filing readiness, and the disclosure cross references.
On the Apple example two real violations sit at the top, a dependent claim that points at a claim that does not exist and a multiple dependent claim written cumulatively rather than in the alternative.
See `screenshots/case-review.png`.
The takeaway is that you triage real, rule backed issues at a glance.

## 11. Click a finding to see why

Click any finding and you land on the reasoning beside the governing rule, with your draft on one side and the real MPEP text on the other, scrolled to the responsive passage and linked to the USPTO source.
On the example the non existent claim 6 finding opens MPEP 608.01(n) on dependent claims.
See `screenshots/case-evidence.png`.
The takeaway is that every issue is one click from the exact rule that backs it, which is the anti hallucination spine in action.

## 12. Rules that apply now and next

Alongside the errors, Pincite surfaces the rules that govern this application right now, each one corpus validated and openable in the same evidence pane.
Conditional rules wait in attention with their trigger shown, and light up once the trigger is met.
See `screenshots/case-rules.png`.
The takeaway is that you see not just what you got wrong but what the rules require going forward.

## 13. Stage and what to do now

Pincite reads where the draft sits in the lifecycle, explains why, and says what is missing to advance.
Once you declare a status such as filed, published, office action, allowed, or granted, it tells you the next deadline driven step, from an office action reply window to the issue fee to maintenance fees, each pinned to its rule.
See `screenshots/case-stage.png`.
The takeaway is that the tool follows the patent through its whole life, not just drafting.

## 14. Prior art, the similar patents

This step finds public patents that overlap your claims, and it needs at least one drafted claim, so it tells you and stays disabled until then.
You can compare against one patent you paste, which is free and local, or run a live search that pulls candidates from Google's public patent data on BigQuery.
Each result leads with the overlaps, pinned to the patent passage and to your own claim element, with a transparent score and a link to the patent.
There is deliberately no single novelty number, because one number invites over trust.
See `screenshots/case-prior-art.png`.
The takeaway is decomposed, verifiable overlaps instead of a black box score.

## 15. Sign the inventor's declaration

A pro se inventor completes the oath here, and the step needs inventors entered first.
Each inventor reviews the application, confirms the five statements the USPTO requires under 37 CFR 1.63, and types their legal name to record the attestation.
The filing readiness checks run here too and flag defects such as a declaration that does not match the ADS or a missing required statement.
Pincite records the attestation; the legally binding signature is the one you submit to the USPTO, because Pincite never files.
See `screenshots/case-sign.png`.
The takeaway is a checked, recorded declaration, with the human kept in the loop.

## 16. The filing-ready export

The output is a real document set, not a generic PDF.
The specification exports as a DOCX in 37 CFR 1.77 section order with bracketed paragraph numbering, which also avoids the USPTO non DOCX surcharge.
The package adds the ADS data card for the Patent Center web form, the inventor declaration, a transmittal, and a fee summary, bundled as a ZIP, and it carries only filing documents, never the internal analysis.
See `screenshots/case-report.png`.
The takeaway is that what you hand the USPTO comes out ready, not as a homework printout.

## 17. Audit log and version history

Every meaningful action is written to an append only audit log with a filterable viewer, and section saves keep a full restorable version history.
See `screenshots/case-audit.png`.
The takeaway is a complete, tamper evident record of what happened and when.

## 18. Removing a patent, admin only

Removing a patent is gated to an admin account, checked on the server, so a regular user never sees the control and cannot delete.
The takeaway is that destructive actions are restricted and audited.

---

## Throughout, the things that are always true

These are not steps; they hold across the whole product and are worth a sentence each in the script.

- Citation discipline.
  Every MPEP number a check or the model produces is validated against the ingested corpus before display, and unresolved numbers are dropped.
- Security and cost.
  Row level security scopes every table to its owner, every paid call is rate limited per user, and account wide budget caps keep BigQuery inside its free tier so it effectively never bills.
- Confidentiality.
  Data is stored in a US region with encryption, and real invention text only goes to vendors that do no training or retention.
  The embeddings vendor is opted out; the generation vendor zero data retention is the last piece to enable, so until then use synthetic or public text for the two features that send text to that model, which are the eligibility walkthrough and the drawing vision.
- What Pincite does not do.
  It does not give legal advice, it does not file with the USPTO, and it produces no single novelty or patentability score by design.

---

## Suggested demo order

For a video, the natural path is steps 1 through 17 in order, using the Apple example.
A tight version is sign in, dashboard, then disclosure, inventors, drawings with the red circle drawing check and the 3D toggle, review with a click into the rule, prior art, sign, and the export.
That sequence hits every headline feature and ends on the filing ready output.
