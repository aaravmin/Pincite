# Pincite demo script for a patent agent (4 to 5 minutes)

A timed walkthrough for a screen recording.
The example is a utility filing for Apple's round pizza box.
Paste from docs/demo-pizza-box-fields.md so the boxes are already filled and the figures already uploaded before you record, so on camera you navigate a finished matter instead of typing.

Each beat starts with a running time in minute.second form.
Say is the voiceover. Do is what happens on screen.
Target run time is about 4 minutes 40 seconds. Beats marked optional can be cut to reach 4 minutes.

Before recording, run the drawing check on at least one figure and run one prior-art search, so both load instantly on camera.

---

### 0.00 Open

Say. "This is Pincite, a patent review workbench. It flags rule problems in a draft, finds similar public patents, and pins every rule it cites to the real MPEP and CFR text. Here is how I run a matter as a patent agent."

Do. Land on the dashboard, already signed in as a patent agent. Show the Portfolio view with the matter card.

### 0.20 The draft

Say. "Each matter is one application. The draft is a section by section editor in the standard filing order, and everything autosaves. At the end I open All sections to see the whole thing in one place and save a version, which is an immutable snapshot."

Do. Open the project. Click Title, Background, and Claims in the left nav. On the Claims section, point out the claim tree below the editor that shows the three independent claims with their dependents nested. Click All sections, then Save version.

### 0.55 Invention intake

Say. "The disclosure uses the same dashboard, so the plain language intake feeds the draft and the duty to disclose. Pincite cross references the two and tells me when something I disclosed never made it into the draft."

Do. Open Disclosure, click a field, then All fields to show the consistency check at the bottom.

### 1.20 Inventors and applicant

Say. "Inventors and the applicant go into the ADS data card. Here Apple is the applicant and the two named inventors sign their own declarations later."

Do. Open Inventors, show the two inventors and the company applicant.

### 1.35 Drawings

Say. "I upload each figure by orientation, so I can flip through perspectives. The drawing check reads every figure at once and circles compliance problems right on the image, like a reference number that is in the drawing but never described. The flags are saved with the matter, so they are still here when I come back. If a scan comes in sideways, one rotate control turns it upright."

Do. Open Drawings. Flip between perspectives. Click Check all drawings and let the red circles appear. Navigate away and back to show the flags persisted. Briefly show the rotate left and rotate right control on a figure.

### 2.15 Review, fix, and recheck

Say. "Review runs the rule checks. Each finding is colored by severity, pinned to its source, and shows the exact phrase that triggered it. The part I lean on most is Take me to issue, which jumps to the field that caused it, I make the edit, and Check if fixed re runs that one rule and confirms it. On this real Apple claim set it catches a vague term, about 360 degrees, and a component I disclosed but never described."

Do. Open Review, click Check for issues. Expand a relative-term finding and show the What triggered this phrase. Click Take me to issue, edit the text, return to Review, click Check if fixed, show Looks fixed.

### 3.05 Subject matter eligibility (optional)

Say. "Analyze section 101 walks the eligibility test, and it opens with a plain explanation of what section 101 even is, framed as the model's read to verify rather than a verdict."

Do. Click Analyze section 101, show the What is section 101 explanation and the step by step panel.

### 3.25 Rules and stage

Say. "Rules shows what applies now in green, and each one says why it applies, with the source one click away. It also shows what may apply next in yellow with the trigger. Stage tells me where the application sits and what is missing to advance."

Do. Open Rules, point out a Why this applies line. Open Stage briefly.

### 3.45 Prior art

Say. "Prior art finds similar public patents. It runs with no setup on any machine. I get a similarity signal and the specific overlapping language, never a single trust me score, and I can open the actual patent and page through its figures."

Do. Open Prior art, click Run search. The page scrolls so the results and detail have room. Open a result, show the similarity percent and the pinpoint overlaps, and expand View the actual patent to page through its figures.

### 4.20 Sign and export

Say. "Each inventor signs the declaration in app, and Pincite checks the signed declaration and the ADS for real filing defects. Then I export a USPTO aligned package, the draft as a compliant DOCX plus the ADS and the declaration."

Do. Open Sign, show a captured declaration. Open the export and trigger the package download.

### 4.40 Settings and close

Say. "Settings has a dark mode, lets me switch between the attorney and the pro se inventor workflow, and exports my full audit log, since every action in here is recorded."

Do. Open Settings, toggle dark mode, show the role switch and Export audit log. End on the dashboard.

Say. "Pincite, from a draft to a filing ready package, with every rule pinned to real text."

---

## Cut list to reach 4 minutes

Drop the 3.05 eligibility beat.
Drop the Stage half of the 3.25 beat.
Drop the rotate aside in the 1.35 beat.

## Before you record

Fill the project from docs/demo-pizza-box-fields.md, with all figures uploaded and tagged by orientation.
Run Check all drawings once so the saved flags show right away.
Run one prior-art search so results load instantly.
Pick light or dark mode before you start, since the only place dark mode appears is when you toggle it at the end.
