# Pincite demo script - patent agent walkthrough (3 to 4 minutes)

A tight, timed walkthrough for a screen-recorded demo.
The example is a utility filing for Apple's circular vented pizza box.
Paste from `docs/demo-pizza-box-fields.md` so the boxes are already detailed before recording, or fill them live if you prefer.
Each beat lists what to SAY (voiceover) and what to DO (on screen).
Target run time is about 3 minutes 30 seconds. Beats marked optional can be cut to reach 3 minutes.

Tip: pre-load the project with all fields filled and the figures uploaded, so on camera you are navigating a finished matter, not typing.

---

## 0:00 - 0:18 - Open

SAY: "This is Pincite, a patent review workbench. It flags rule violations in your draft, finds similar public patents, and pins every rule it cites to the real MPEP and CFR text. Here is how I would run a matter as a patent agent."

DO: Land on the dashboard, already signed in as a patent agent. Show the Portfolio view with the matter card.

## 0:18 - 0:55 - The draft

SAY: "Each matter is one application. The draft is a section-by-section editor in the 1.77 order. Everything autosaves, and I can save an immutable version at any point."

DO: Open the project. Click through Title, Background, Claims in the left nav to show the editor. Click All sections to show the whole spec in one place, then click Save version.

## 0:55 - 1:20 - Invention intake and inventors

SAY: "The invention disclosure uses the same dashboard, so the technical intake feeds the specification and the duty to disclose. Pincite cross-references the two and tells me if a component I disclosed never made it into the draft."

DO: Open Disclosure, click a field or two, then All fields to show the consistency check at the bottom. Open Inventors to show the ADS data card with the two inventors and the company applicant.

## 1:20 - 2:00 - Drawings with the vision check

SAY: "I upload each figure by orientation, so I can flip through perspectives. The drawing check reads each figure and circles compliance problems right on the image, like a reference numeral that is in the drawing but never described in the spec. The flags are saved with the matter, so they are still here when I come back."

DO: Open Drawings. Flip between the perspective, top, and bottom views. Click Check drawing (vision) and let the red circles appear. Navigate away and back to show the flags persisted (the button now reads Re-check).
Optional: upload the 3D model, turn it with the orientation toggle, then Remove it to show it is only a visualization aid.

## 2:00 - 2:40 - Review, fix, and re-check

SAY: "Review runs the rule checks. Each finding is colored by severity and pinned to its source. The part I rely on most: Take me to issue jumps straight to the field that caused it, I make the edit, and Check if fixed re-runs just that rule and confirms it."

DO: Open Review, click Check for issues. Expand a finding, click Take me to issue, edit the text in the draft, return to Review, click Check if fixed, show "Looks fixed."
Optional: click Analyze section 101 to show the neutral Alice/Mayo walkthrough, labeled as the model's read to verify.

## 2:40 - 2:55 - Rules and stage (optional)

SAY: "Rules shows what applies now in green and what becomes relevant next in yellow, each openable to its source. Stage tells me where the application sits and what is missing to advance."

DO: Click Rules, then Stage. Keep this brief.

## 2:55 - 3:25 - Prior art

SAY: "Prior art finds similar public patents. It runs with no setup on anyone's machine. I get a similarity signal and the specific overlapping language, never a single trust-me score, and I can open the actual patent and page through its figures."

DO: Open Prior art, click Run search. Open a result, show the similarity percent and the pinpoint overlaps, expand View the actual patent to page through its figures.
Optional: show Compare a patent for a head-to-head against one patent you paste.

## 3:25 - 3:45 - Sign and export

SAY: "Inventors sign the declaration in app, and Pincite checks the signed declaration and the ADS for real filing defects. Then I export a USPTO-aligned package: the specification as a 1.77 DOCX, the ADS, and the declaration."

DO: Open Sign, show the captured declaration. Open the export and trigger the DOCX or filing package download.

## 3:45 - 3:58 - Settings and close

SAY: "Settings has a dark mode, lets me switch between the attorney and pro se inventor workflows, and exports my full audit log. Every action in here is recorded and exportable."

DO: Open Settings, toggle dark mode, show the role switch and Export audit log. End on the dashboard.

SAY (close): "Pincite, from a draft to a filing-ready package, with every rule pinned to real text."

---

## Cut list to hit 3:00

- Drop the 2:40 to 2:55 Rules and stage beat.
- Drop the optional 101 analysis and Compare a patent lines.
- Drop the 3D upload and remove, or keep only the remove as a quick aside.

## Pre-recording checklist

- Project filled from `docs/demo-pizza-box-fields.md`, with all figures uploaded and tagged by view.
- Run the drawing check on at least one figure beforehand so the saved flags are visible immediately.
- Run a prior-art search once beforehand so results load instantly on camera.
- Decide light or dark mode before you start (toggling it on camera is the only place dark mode appears).
