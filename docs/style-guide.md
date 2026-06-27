# Style guide

> UI conventions behind `CLAUDE.md`. Aesthetic target: Notion — low chrome, mostly
> white/black, color strictly as data.

## Color system (roadmap §2.1) — the only colors allowed to MEAN something
| Token | Meaning | Use |
|---|---|---|
| neutral (white/black/gray) | canvas, text, structure, borders | everything non-signal |
| `violation` (red) | a rule break / likely violation | flagged span, violation finding, anticipated element |
| `attention` (yellow) | applies-here highlight / conditional / soft language | responsive MPEP portion, conditional rule, relative term |
| `pass` (green) | applies and is fine / passed check | governing rule, passed check, completed section |

Rules enforced in review + the verify-feature gate:
- A color is **never** decorative. Red=violation, yellow=highlight/conditional, green=ok.
- **Color is never the only signal.** Every colored item also has a text label and a
  shape: solid dot = violation, outline dot = conditional, check = pass.
- WCAG AA contrast for text on every background; highlights must stay distinguishable in
  grayscale (so PDF export survives).
- Tokens live in `app/globals.css` (`--violation`, `--attention`, `--pass`, each with
  `-bg` and `-foreground`). Use `bg-violation-bg`, `text-violation`, etc. **Never** raw
  Tailwind palette colors (`text-red-500`) in app code.

### Why not `--color-*: initial`
The research suggested nuking Tailwind's default palette to force the strict set. We did
NOT, because shadcn needs neutral tokens (background/border/muted/ring/…). Instead we
keep shadcn's neutral tokens + the 3 signal tokens and enforce discipline by review.

## Editors are plain-text, not rich-text
The validator and evidence pane depend on stable character offsets
(`findings.span_start/end`, `match_spans`). Each section is a controlled plain-text
editor (textarea / plaintext-only contentEditable) storing a raw string; highlights are
an overlay computed from offsets. A Tiptap/Lexical document model would make offsets
fragile, so we avoid it for section content.

## Components (shadcn mapping)
- Sidebar → section nav. ResizablePanelGroup → the half-screen evidence split.
- Sheet → slide-in evidence pane (and mobile). Tabs + plain-text editors → intake.
- Badge/Card → findings + rule lists (with label + shape, per above).
Add shadcn primitives on demand: `pnpm dlx shadcn@latest add <component>`.

## Voice
No emojis anywhere. Words spent on substance. Terse. (Matches the user's own style:
no em dashes, colons, or semicolons in product copy where avoidable.)
