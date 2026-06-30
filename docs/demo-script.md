# Pincite demo script for a patent agent (4 to 5 minutes)

A timed walkthrough for a screen recording.
The example is a utility filing for Apple's round pizza box.
Fill the draft, the disclosure, and the inventors from docs/demo-pizza-box-fields.md and upload the figures before you record, so on camera you navigate a finished matter instead of typing.

Each beat starts with a running time in minute.second form.
Say is the voiceover. Do is what happens on screen.
You stay quiet through the draft, the disclosure, and the inventors except for the claim tree. You start talking at the drawings.
Target run time is about four minutes forty seconds. Beats marked optional can be cut to reach four minutes.
Style note for the voiceover. Keep it semi conversational and to the point. No em dashes, no semicolons, no colons.

---

### 0.00 Open

Say. "This is Pincite, a patent review workbench. I paste a patent in section by section and it flags rule problems, pins every rule it cites to the real MPEP and CFR text, finds similar public patents, and walks me to a filing ready package. Here is a real Apple utility filing for a round pizza box."

Do. Land on the dashboard signed in as a patent agent. Show the portfolio table, one flat row per matter with the company, the next step, the live issue count, and the version count. Open the matter.

### 0.20 The overview

Say. "Every matter opens here. It tells me where the application stands, the single next thing to do, and a checklist of all nine steps with a live status, so I am never guessing what is left."

Do. Show the overview. Point at the stage, the Next step button, the completeness bar, and the checklist with its green checks and red dots.

### 0.40 Draft, disclosure, and inventors (no voiceover)

Say. Nothing here. Let the screen move quietly so the viewer sees a finished matter.

Do. Click through a few Draft sections in the left nav, open the Disclosure, and open the Inventors. Keep it brief. The boxes are already filled, so this is just a look, not typing.

### 1.05 The claim tree

Say. "The one thing I will call out in the draft is the claims. Pincite reads the whole set into a tree under the editor, so I can see the three independent claims and exactly which dependent claim hangs off which. That is how I keep twenty three claims straight, and it is read only, so it never changes my text."

Do. Open the Claims section. Point at the tree, trace claim 1 down to its dependents, then show claim 8 and claim 17 as the other two independents.

### 1.35 Drawings

Say. "The figures are already uploaded. The patent drew most sheets sideways, so I straighten one with rotate, and the corrected image is what gets saved and checked. When I open the editor the reference numerals become labels I can drag, with lead lines to the part, and the issue list updates live, so deleting a numeral the draft never describes clears that error on the spot. I can also have Pincite read a figure to set its view, and run the drawing check across every figure at once."

Do. Rotate a sideways figure upright. Open Edit drawing, drag a numeral, add a lead line, delete one and watch the issue clear, then Save. Click Check all drawings and let the red circles land on the undescribed numbers 16, 28, and 54. Show Export PNG and Export SVG on a figure.

### 2.25 Review, fix, and recheck

Say. "Review runs the rule checks. Each finding is colored by severity, pinned to its source, and shows the exact phrase that triggered it. Take me to issue jumps to the field. When I am not sure how to fix something, Auto fix drafts the smallest edit and shows it as a before and after that I accept or reject, like resolving a diff. Check if fixed re runs that one rule. On this real Apple matter it catches an abstract over the word limit, a claim missing its period, a vague term, and a part I disclosed but never described."

Do. Open Review, click Check for issues. Expand a finding and show the trigger phrase. On the missing period, click Auto fix, show the before and after, and Accept. On another, click Take me to issue, edit it, then Check if fixed and show Looks fixed.

### 3.10 Eligibility (optional)

Say. "Analyze section 101 walks the eligibility test, and it opens with a plain explanation of what section 101 even is, framed as the model's read to verify rather than a verdict."

Do. Click Analyze section 101 and show the explanation and the step by step panel.

### 3.25 Rules and stage

Say. "Rules shows what applies now in green, each with a why it applies line and the source one click away, and what may apply next in yellow with the trigger, like means plus function claiming when a claim says means for instead of naming a part. Stage tells me where the application sits and what is missing to advance."

Do. Open Rules, point at a why line and a may apply next trigger. Open Stage briefly.

### 3.45 Prior art

Say. "Prior art finds similar public patents with no setup on any machine. I get a similarity signal and the specific overlapping language, never a single trust me score, and I can open the actual patent and page through its figures. A red flag means the prior art matches a full claim limitation."

Do. Open Prior art, click Run search. Open a result, show the similarity and the pinpoint overlaps, and expand the actual patent to page through its figures.

### 4.15 Sign

Say. "Each inventor signs the declaration with an S signature, their name between forward slashes, which is the USPTO electronic signature. Pincite checks the signed declaration and the ADS for real filing defects before anything leaves."

Do. Open Sign, show a captured declaration with its S signature and the filing readiness checks.

### 4.30 Export

Say. "Then I export. A USPTO aligned DOCX of the specification, a full filing package with the ADS and the declaration, and a patent format LaTeX bundle that typesets the whole application, drawings and all, like a published patent."

Do. Open the Submission step, trigger the package download, and point at the patent format option.

### 4.45 Settings and close

Say. "Settings has dark mode, switches between the attorney and the pro se inventor workflow, and exports my full audit log, since every action in here is recorded."

Do. Open Settings, toggle dark mode, show the role switch and Export audit log. End on the dashboard.

Say. "Pincite, from a draft to a filing ready package, with every rule pinned to real text."

---

## Cut list to reach four minutes

Drop the 3.10 eligibility beat.
Drop the Stage half of the 3.25 beat.
Shorten the drawings beat to rotate, one live error clear, and Check all drawings.

## Before you record

Fill the draft, the disclosure, and the inventors from docs/demo-pizza-box-fields.md, and upload all figures tagged by orientation, off camera.
Run Check all drawings once so the saved flags show right away.
Run one prior-art search so results load instantly.
Sign at least one declaration so the Sign step shows a captured S signature.
Pick light or dark mode before you start, since the only place dark mode appears is when you toggle it at the end.
