# Pincite demo script (4 to 5 minutes)

A conversational voiceover for a screen recording.
The case study is a real Apple utility filing for a round pizza box.
Fill the draft, the disclosure, and the inventors from docs/demo-pizza-box-fields.md and upload the figures before you record, so on camera you are walking a finished matter, not typing.

Each beat starts with a running time in minute.second form.
Say is what you say. Do is what happens on screen.
You stay quiet through the draft, the disclosure, and the inventors, where you fast forward at 3x. You start talking again at the claims.
Target run time is about four minutes forty. Beats marked optional can be cut to reach four minutes (see the cut list at the end).
Voice. Keep it relaxed and direct. Short sentences. No em dashes, no semicolons, no colons.

---

### 0.00 The hook

Say. "This is Pincite. It is a workbench for reviewing a patent application before you file it. You paste your application in section by section, and it checks your work against the actual rules, the MPEP and the federal regulations. And everything it flags is pinned to the real rule text, so you can verify it yourself. Nothing reaches the screen on trust. The case study today is Apple's circular pizza box, which I promise is a real patent Apple actually filed. Not a joke. You can look it up."

Do. Start on the dashboard, signed in as a patent agent.

### 0.25 Where a matter lives

Say. "This is my portfolio. One row per matter, with the client, the next step, and a live count of open issues. Let me open the pizza box. Every matter opens on this overview. It tells me where the application stands, the one next thing to do, and a checklist of all nine steps with a live status. So I am never guessing what is left."

Do. Open the matter. Show the overview. Point at the stage, the Next step button, the completeness bar, and the checklist with its green checks and red dots.

### 0.55 Fast forward (no voiceover)

Say. "I have already filled the draft, the disclosure, and the inventor details, so let me fast forward through those."

Do. Speed the recording to 3x and click through the draft sections, the disclosure, and the inventors with no voiceover. Slow back to normal speed when you land on Claims.

### 1.05 The claim tree

Say. "I am stopping on the claims, because this is one of my favorite small touches. Claims are the legal heart of a patent, and they reference each other, which gets hard to track fast. Pincite reads the whole set and builds this tree. I can see my three independent claims and exactly which dependent claim hangs off which. Twenty three claims, and I can follow the whole structure at a glance. It is read only, so it never touches my wording."

Do. Open the Claims section. Point at the tree, trace claim 1 down to its dependents, then point at claim 8 and claim 17 as the other two independents.

### 1.35 Drawings

Say. "Now the drawings. The patent drew most of these sheets sideways, so I just rotate one upright, and the straightened version is what gets saved and checked. When I open the editor, every reference number on the figure becomes a label I can drag, each with a lead line to the part it points at. And the issue list updates live. So if I delete a number the spec never describes, that error clears on the spot. I can also have Pincite read a figure and set its view for me, and run a check across every figure at once. Each figure exports on its own, and they all flow into the final filing."

Do. Rotate a sideways figure upright. Open Edit drawing, drag a numeral, add a lead line, delete one and watch the issue clear, then Save. Click Check all drawings and let the red circles land on the undescribed numbers. Show Export PNG and Export SVG on a figure.

### 2.25 Review, the main event

Say. "This is the core of the tool. I click Check for issues and it runs every rule check at once. Findings group by where they live, the claims or the spec, and each is colored by how serious it is. Red is a real violation. Yellow is a verify this, not a hard error. On this matter it catches four red violations. My abstract runs over the word limit. Claim 7 is missing its period, so it is not one sentence. Claim 16 points to a claim 30 that does not exist. And claim 23 is a multiple dependent claim written the wrong way. Plus three softer flags to check. A vague term, a means for limitation, and a claim term with no antecedent."

Say. "Here is the part I care about. I click any finding and it shows the reasoning, the exact phrase that triggered it, and the actual rule text pinned right next to my draft. Take me to issue jumps to that spot. And when I am not sure how to fix something, Auto fix drafts the smallest edit and shows it as a before and after, like a diff, and I accept or reject. Then Check if fixed re runs just that one rule, so I know it is gone."

Do. Open Review, click Check for issues. Expand the claim-7 missing-period finding, show the trigger phrase and the pinned rule. Click Auto fix, show the before and after, Accept. On another finding, click Take me to issue, edit it, then Check if fixed and show Looks fixed.

### 3.35 Eligibility (optional)

Say. "Quick one. Analyze section 101 walks the eligibility test, the Alice and Mayo framework, and it opens by explaining what section 101 even is, framed as the model's read for me to verify, not a verdict."

Do. Click Analyze §101 and show the plain explanation and the step by step panel.

### 3.50 Rules and stage

Say. "Rules splits into two. What applies now, in green, each with a why it applies line and the source one click away. And what might apply next, in yellow, with the trigger spelled out. Means plus function is a good example. The trigger is a claim that says means for instead of naming a part, and because claim 9 does say that, this one flips to now applies. Stage just tells me where the application sits and what is missing to move it forward."

Do. Open Rules, point at a why line, then at the means plus function rule showing now applies. Glance at Stage.

### 4.10 Prior art

Say. "Prior art finds similar public patents, and it runs on any machine with no setup. The thing I like is what it gives me. A similarity signal and the specific overlapping language, never one trust me score. I can open the actual patent and page through its figures. And red means the prior art hits a full claim limitation, not just a vibe."

Do. Open Prior art, click Run search. Open a result, show the similarity and the pinpoint overlaps, then expand the real patent and page through its figures.

### 4.30 Sign

Say. "Signing is honest about what holds up. A click in an app is not a binding signature. As the attorney I download my own documents here, the power of attorney to file and each inventor's declaration to collect, get them signed on paper, and upload the signed copies. Pincite never asks me to certify that I am the inventor, and the filing defect checks live on Review, not here. A pro se inventor sees the flip side, where they confirm the five declaration statements and upload their own signed declaration."

Do. Open Sign, download the power of attorney and an inventor declaration, and upload a signed copy.

### 4.45 Export

Say. "Then I export. A USPTO formatted Word file of the specification, a full filing package with the data sheet and the declaration zipped together, and my favorite, a LaTeX bundle that typesets the whole thing, drawings and all, so it reads like a real published patent."

Do. Open the Submission step, trigger the package download, and point at the LaTeX patent format option.

### 5.00 Settings and close

Say. "Last thing. Settings has dark mode, a switch between the attorney workflow and the pro se inventor workflow, and a full audit log export, because every action in here is recorded. That is Pincite. From a rough draft to a filing ready package, with every rule pinned to the text that backs it."

Do. Open Settings, toggle dark mode, show the role switch and Export audit log. End on the dashboard.

---

## Cut list to reach four minutes

Drop the 3.35 eligibility beat.
Drop the Stage half of the 3.50 beat.
Trim the drawings beat to rotate, one live error clear, and Check all drawings.
In the Review beat, name the four red violations fast and demo Auto fix on just the missing period.

## Before you record

Fill the draft, the disclosure, and the inventors from docs/demo-pizza-box-fields.md, and upload all figures tagged by orientation, off camera.
Run Check for issues once on Review so the four violations and the verify flags are already loaded.
Run Check all drawings once so the saved drawing flags show right away.
Run one prior-art search so results load instantly.
Confirm one inventor's declaration statements and upload a signed copy so the Sign step shows a captured declaration.
Pick light or dark mode before you start, since the only place dark mode appears on camera is when you toggle it at the end.
