---
name: techdebt
description: Scan the Pincite codebase for technical debt — dead/unused code, duplication, complexity hotspots, unused dependencies, and stray TODO/FIXME. Use when asked to assess tech debt, before a cleanup pass, or at the end of a phase. Produces a prioritized, evidence-backed report; does not change code unless asked.
---

# techdebt

A repeatable technical-debt scan. Read-only by default — produce a prioritized report;
only fix when the user explicitly asks. Fan out to roster subagents where it helps.

## Scan dimensions
1. **Unused / missing deps** — delegate to the `dep-auditor` agent (or `pnpm dlx depcheck`,
   reconciled against grep for false positives on config/dynamic imports).
2. **Dead code** — exported symbols never imported; unreachable branches; orphaned files
   under app/, lib/, components/. Grep each suspected export for references before flagging.
3. **Duplication** — repeated logic/markup that should be a shared util or component
   (e.g. the auth+consent redirect guard, Supabase client setup, finding/badge rendering).
4. **Complexity hotspots** — oversized files/functions, deep nesting, long parameter lists.
   List the worst offenders by size and nesting.
5. **TODO/FIXME census** — delegate to the `todo-collector` agent; surface `TODO(phase-N):`.

## Conventions to respect (don't flag intentional choices)
Plain-text editors (offset stability), append-only history, strict color tokens, the
dev-only `/api/dev-login`, and the confidentiality posture are deliberate — see CLAUDE.md
and docs/. Note them as intentional, not debt.

## Output
A prioritized table: `item | location (file:line) | dimension | severity | est. effort |
suggested fix`. Lead with high-severity, low-effort wins. End with a short "do now / do
later / leave it" split. Keep the report tight.
