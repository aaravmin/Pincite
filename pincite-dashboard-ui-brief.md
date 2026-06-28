# Pincite Dashboard UI — Build & Update Brief

## How to use this file (read first)

This is a **checklist of UI patterns**, not a redesign mandate. For each item below:

- **If the feature already exists** and works reasonably, leave it alone. Do not rebuild for the sake of matching this doc.
- **If it's missing** and clearly belongs in Pincite, add it using `shadcn/ui` primitives and the existing Notion-like styling.
- **If you're unsure whether it fits**, use your own judgment. This is a patent / legal-tech product, not a generic SaaS link tracker, so some patterns apply directly, some need adaptation, and a few should be skipped. The "Legal-tech adaptations" section at the end flags the ones that need a second thought.
- When you change something, prefer the smallest diff that satisfies the intent. Don't refactor unrelated code.

Work top to bottom, treat each `[ ]` as an audit item, and note in your summary which ones you added, which you skipped, and why.

---

## Context

Pincite helps a user search prior art and move a patent toward filing. The user cares most about **status, deadlines, claims, prior-art references, and citations** — far more than they care about flashy visuals. The dashboard's job is to make the current state of their applications obvious at a glance and let them act on it without thinking. "If your dashboard looks like it requires a PhD to operate, it's too complex." Do one thing well per screen.

---

## 1. Sidebar (the spine)

The sidebar holds the persistent, globally-relevant elements. Audit for:

- [ ] **Profile / account control** at the top-left (avatar + a caret to signal it's clickable). Search and profile can live here or in a top bar, not both.
- [ ] **Nav links use icon + short label.** This keeps things legible if the sidebar ever collapses, and leaves room for a count or "new" chip.
- [ ] **Collapsible sidebar** support (icon-only collapsed state).
- [ ] **Links grouped by relevance** to reduce cognitive load. For Pincite a sensible grouping is: *Applications / Matters*, *Prior-Art Search*, *Claims*, *Filings*, *Citations*.
- [ ] **Rarely-used links pushed to the bottom**: Settings, Help / Docs.
- [ ] **Nested dropdowns** once a group has too many links to list flat.
- [ ] **Active-state indicator** (the highlight rectangle / accent bar) on the current route.
- [ ] *(Optional)* A spot to surface integrations or a search entry point.
- [ ] *(Optional)* A low-key notifications / changelog area in the empty space, the way Linear and Dub do it.

---

## 2. Main content area

- [ ] **Tighter type and spacing than a landing page.** Dashboards cram more in — smaller font sizes, less vertical air, stricter grid. Don't let it breathe like a marketing page.
- [ ] **The top of the page is for page actions or simple navigation.** For Pincite that's a filter/scope dropdown (e.g. *All matters / By status*) plus the primary action button (*New application* or *New search*).
- [ ] **The main section reflects what matters most to the user.** For a patent tool, that's the list of active applications with their status and next deadline — surfaced at the top, the way a finance dashboard leads with investments.
- [ ] **Keep row data minimal.** Per application show only what earns its place: identifier / title, status, examiner or jurisdiction, last activity, and the next deadline. Resist adding columns "because we have them."
- [ ] **Optional one-line description** per row (GitHub-style) if there's mid-row space to fill.
- [ ] **Stacked list vs. bordered cards** — default to a clean stacked list for less clutter; only give each item its own border if you need stronger visual separation.
- [ ] **Empty states** for every list (no applications yet, no prior-art results, no filings). This is easy to forget and important here.
- [ ] **Multi-select → contextual bulk actions.** Selecting several rows reveals a bulk-action bar (e.g. *Export, Tag, Archive*). Keep destructive bulk actions guarded.

---

## 3. Tables & lists

Tables are the workhorse of this product, so treat them as interactive tools, not static displays.

- [ ] **Separation** handled deliberately — by space, by dividers, or by color (pick one, stay consistent).
- [ ] **Search, filter, and sort** on any table of meaningful length. For Pincite, filtering by status, jurisdiction, examiner, and date range is the high-value set.
- [ ] **Column choices match the task** — a prior-art results table needs reference number, source, relevance, and date; an applications table needs status and deadline.

---

## 4. Charts

Only add a chart if it answers a real question. Avoid decorative or unlabeled charts ("I don't know what these are, and neither does anyone else").

- [ ] **Line chart** for trends over time (e.g. searches run, references reviewed) — include grid lines, axis numbers, a short summary stat, and a date-range selector.
- [ ] **Bar chart** for breakdowns by item (e.g. references per application) — put a favicon/identifier on the side so each bar is recognizable, plus the same range selector.
- [ ] Charts should be simple, labeled, and informative first; aesthetic second.

> Note: Patent work is light on time-series data and heavy on document state. Don't force charts in. A status breakdown or a deadline calendar is often more useful than a trend line — use discretion.

---

## 5. Interaction surfaces — pick the right one

| Surface | Use when | Behavior |
|---|---|---|
| **Popover** | Simple, low-stakes context (display settings, quick filters) | Non-blocking — user can click away with no consequence |
| **Modal** | Related but more complex task you want kept on the same page (e.g. *New application*, *Add reference*) | Blocking — must confirm or cancel; pair with a confirmation toast |
| **Toast** | Make the user aware of something without taking over the screen | Especially for warnings and error states, which get missed |
| **New page** | Permanent or large context (opening a single application or reference) | Requires a back button or breadcrumb |

Audit items:

- [ ] Quick settings live in **popovers**, not modals.
- [ ] Create / edit flows that relate to the current list live in **modals**, with a **toast** on success.
- [ ] Opening a single record routes to a **detail page** with a **breadcrumb** back to the list.

---

## 6. The four building blocks

Almost any new page is some mix of these four. When laying out a new screen, reach for these before inventing anything:

1. [ ] **Lists & tables** — covered above.
2. [ ] **Cards** — charts, summaries, toasts. Keep generous margins; choose outlines on dark mode and filled backgrounds on light mode (or whatever the current theme already does — match it).
3. [ ] **User input** — forms inside modals and settings pages. Validate, and don't leave fields unlabeled.
4. [ ] **Tabs** — add related views without cluttering the sidebar (Notion-style). Good for an application detail page: *Overview / Claims / Prior Art / Filing history*.

---

## 7. Animation & feedback

Keep motion tame and functional — this is a tool, not a landing page.

- [ ] **Chart hover states** that reveal the exact value (and dim sibling bars / show a delta bubble) rather than animating for its own sake.
- [ ] **Optimistic UI** for cheap, reversible actions (renaming, tagging, archiving a draft) so the UI feels instant, the way Gmail removes an email before the server confirms.

---

## 8. Legal-tech adaptations (the discretion layer)

These are the places where the generic dashboard advice needs a second look for a patent product. Apply judgment here.

- [ ] **Do NOT use optimistic UI for actual filings or deadline-critical submissions.** A USPTO/EPO submission that silently failed but showed "done" is a malpractice-grade bug. Show a real pending → confirmed state with the actual server response. Optimistic UI is fine for local edits only.
- [ ] **Deadlines deserve more weight than a normal "metric."** Surface the nearest deadline prominently, and use toasts/banners for approaching or missed deadlines — error and warning states are the most important ones to get right here.
- [ ] **Citations are first-class.** Given the product name, make sure pin-cite / reference formatting is consistent, copyable, and shown wherever a reference appears (tables, detail pages, exports).
- [ ] **Destructive actions on legal records should confirm explicitly** (modal, not a bare optimistic delete) — applications, claims, and references shouldn't disappear on a single misclick.
- [ ] **Empty and error states for search** should distinguish "no results found" from "the search source failed" (relevant given prior-art scraping can fail upstream). Don't show an empty state when the real problem is a failed fetch.
- [ ] **Audit trail / activity** is often expected in legal tooling. If there's space and it doesn't exist, a lightweight per-record activity log is worth proposing — but flag it rather than building it blind.

---

*Source: distilled from a dashboard-UI walkthrough and adapted to Pincite's patent-filing context. Treat the legal-tech section as overriding the generic advice wherever they conflict.*
