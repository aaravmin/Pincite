# Pincite Architecture Refactor Brief

## Objective

Refactor Pincite into a clear, feature-oriented modular monolith while preserving its current behavior, routes, database schema, and user experience.

The goal is not a wholesale rewrite. Improve the boundaries between:

- Domain logic
- Application orchestration
- Database and external-service infrastructure
- Server actions and route handlers
- React UI

The finished repository should be easier for a new contributor or technical interviewer to navigate, test, and explain.

## Working principles

1. Make small, reviewable changes. Do not move the entire repository in one commit.
2. Preserve behavior before improving implementation.
3. Add characterization or unit tests before moving important logic.
4. Keep Next.js pages, layouts, server actions, and route handlers thin.
5. Keep domain functions pure: no Next.js, Supabase, cookies, redirects, auditing, network requests, or cache invalidation.
6. Use React `cache()` only for per-request server deduplication. Do not persistently cache user-scoped data.
7. Parallelize independent server reads with `Promise.all()`.
8. Do not introduce a generic abstraction until at least two real consumers require it.
9. Do not change public URLs during this refactor.
10. Do not rewrite Git history or alter production data.

## Current architectural problems

### Repeated route concerns

Protected pages repeatedly:

- Create a Supabase client
- Load the authenticated user
- Load the profile
- Check consent
- Redirect when unauthorized

These checks should be centralized in a protected route group and a request-cached viewer loader.

### Database access mixed with domain logic

Some query functions both load records and perform business calculations. For example, dashboard loading also runs validators, detects stages, calculates completeness, and chooses next steps.

Database loaders should return data. Pure domain functions should calculate derived state.

### Infrastructure inside reusable logic

Some modules that appear to contain reusable business logic directly create Supabase clients. Citation resolution is one example. Split pure citation partitioning from the repository that checks which citations exist.

### Large orchestration files

The following areas contain multiple unrelated responsibilities:

- `lib/filing/actions.ts`
- `lib/validators/run.ts`
- `app/api/projects/[id]/export/route.ts`
- Large feature client components such as the review and prior-art clients

Split these by use case, not merely by line count.

### Duplicate project data loading

The project layout and several project pages independently reload sections, inventors, attachments, disclosure data, and export state. Introduce a request-cached project snapshot loader.

### Untyped database boundary

Supabase results are frequently cast to application types. Generate Supabase database types, apply them to the clients, and explicitly map database rows into domain objects where needed.

## Target architecture

Keep the App Router, but make `app/` a thin routing and composition layer.

```text
app/
  (public)/
    page.tsx
    privacy/
    terms/

  (protected)/
    layout.tsx
    dashboard/
    projects/[id]/
      layout.tsx
      overview/
      review/
      prior-art/
      submission/

features/
  projects/
    domain/
      project.ts
      sections.ts
      stage.ts
      readiness.ts
    application/
      get-project.ts
      get-project-snapshot.ts
      get-dashboard.ts
      save-section.ts
    infrastructure/
      project-repository.ts
      supabase-project-repository.ts
    ui/

  review/
    domain/
      finding.ts
      tier1.ts
      tier2.ts
      tier3.ts
      cross-reference.ts
    application/
      run-review.ts
      recheck-finding.ts
      propose-fix.ts
      apply-fix.ts
      get-review-page.ts
    infrastructure/
      findings-repository.ts
      supabase-findings-repository.ts
    actions.ts
    ui/

  filing/
  drawings/
  prior-art/
  mpep/
  exports/

shared/
  auth/
    require-viewer.ts
  db/
    server.ts
    admin.ts
    database.types.ts
  audit/
  rate-limit/
  llm/
  text/

components/
  ui/                    # Reusable shadcn primitives only
```

This is a target direction, not a requirement to move every file immediately. Complete one vertical feature at a time.

## Dependency rules

```text
Routes and UI -> Application -> Domain
                           -> Infrastructure
```

Apply these rules:

- Domain modules may import other domain modules and dependency-free shared utilities.
- Domain modules must not import Next.js, React, Supabase, cookies, server actions, provider SDKs, or database clients.
- Application modules coordinate domain functions and infrastructure interfaces.
- Infrastructure modules implement persistence and provider access.
- Server actions and route handlers authenticate, validate input, call one application operation, translate the result, and revalidate or redirect if necessary.
- Feature UI may depend on the feature's public types and actions, but not directly on infrastructure.
- Features must not import another feature's infrastructure internals.
- Use `import "server-only"` in server-only infrastructure and provider modules.

## Implementation plan

### Phase 1: Establish safety and typed boundaries

1. Run the existing lint, TypeScript, build, and Playwright gates and record the baseline.
2. Add fast unit tests for pure, high-value logic:
   - `lib/validators/tier1.ts`
   - `lib/validators/tier2.ts`
   - `lib/patent/claims.ts`
   - `lib/stage/detect.ts`
   - Citation partitioning behavior
   - Readiness calculations
3. Add a `test` script that runs these unit tests without external services.
4. Generate Supabase `Database` types and use `createServerClient<Database>()` and the equivalent typed browser/admin clients.
5. Replace unsafe database-result casts when touching a file. Do not perform an unreviewed global cast rewrite.

Acceptance criteria:

- Fast unit tests run without Supabase, BigQuery, LLM credentials, or a browser.
- Existing end-to-end behavior remains unchanged.
- Supabase clients are typed.
- Lint and TypeScript checks pass.

### Phase 2: Centralize protected-route authorization

1. Introduce `shared/auth/require-viewer.ts`.
2. Use React `cache()` so repeated calls within one request share the authentication/profile lookup.
3. Return the authenticated user, profile, and typed Supabase client.
4. Create a protected route group with a layout that enforces authentication and consent.
5. Move protected routes into the route group without changing their URLs.
6. Remove duplicated authentication and consent code from protected pages.
7. Keep API authentication explicit. Route handlers should return `401`/`403`, not browser redirects.

Illustrative interface:

```ts
export type Viewer = {
  user: AuthUser;
  profile: ViewerProfile;
  supabase: TypedSupabaseClient;
};

export const requireViewer: () => Promise<Viewer>;
```

Acceptance criteria:

- Protected pages do not repeat user/profile/consent queries.
- Public, authentication, callback, and API routes remain reachable.
- Existing login, consent, role, and protected-route tests pass.

### Phase 3: Introduce a project snapshot

Create an application-level `ProjectSnapshot` containing the common data needed across project screens:

```ts
export type ProjectSnapshot = {
  project: Project;
  sections: Record<SectionKey, string>;
  inventors: Inventor[];
  attachments: Attachment[];
  disclosure: Disclosure;
  exports: ExportRecord[];
};
```

Implement a request-cached `getProjectSnapshot(projectId)` that:

- Requires or accepts the current viewer
- Starts independent queries together
- Awaits them with `Promise.all()`
- Returns `null` when the project is not visible to the viewer
- Relies on RLS as defense in depth, not as a replacement for application authorization
- Does not place user-scoped data in a persistent Next.js cache

Use it to eliminate duplicate loading across the project layout, overview, review, filing, and export operations where appropriate.

Do not force dashboard loading through one snapshot per project. Preserve the dashboard's batched-query approach to avoid N+1 queries.

Acceptance criteria:

- Common project data has one canonical loader.
- Independent reads run concurrently.
- No new N+1 query pattern is introduced.
- Project ownership boundaries remain enforced.

### Phase 4: Refactor the review feature as the reference vertical slice

Refactor review before touching every other feature. Use it as the architectural example for later work.

#### Domain

Move or expose pure review logic under `features/review/domain/`:

- Claim parsing
- Tier 1, Tier 2, and deterministic Tier 3 validation
- Cross-reference checks
- Finding types and severity rules
- Pure citation partitioning, given a set of valid citation numbers

Pure validators should accept plain data and return findings.

#### Application

Create separate use-case modules:

- `run-review.ts`
- `recheck-finding.ts`
- `propose-fix.ts`
- `apply-fix.ts`
- `analyze-eligibility.ts`
- `get-rule-section.ts`
- `get-review-page.ts`

Application operations may coordinate repositories, citation resolution, rate limiting, LLM providers, auditing, and persistence. Keep provider-specific details in infrastructure.

#### Infrastructure

Create focused adapters for:

- Loading and replacing findings
- Resolving MPEP citations against the corpus
- Loading relevant sections
- Calling the generation provider

#### Server actions

Keep actions thin. Each action should:

1. Authenticate.
2. Parse and validate its input.
3. Call one application operation.
4. Revalidate the appropriate path.
5. Return a serializable result.

Aim for actions under approximately 30–50 lines.

#### UI

Split the review UI by responsibility:

```text
review-client.tsx       # Mutation state and orchestration
review-toolbar.tsx
finding-groups.tsx
finding-item.tsx
fix-proposal.tsx
eligibility-panel.tsx
evidence-panel.tsx
```

Do not split purely to reduce file length. Extract components that have independent behavior, state, or presentation responsibility.

Acceptance criteria:

- Review domain functions are independently unit-tested.
- The review page loads a single page model rather than coordinating repositories itself.
- Review server actions contain no validator implementations or raw database queries.
- Existing review, claims, auto-fix, rules, and accessibility tests pass.

### Phase 5: Refactor dashboard derivation

Split dashboard behavior into:

1. A batched repository query that loads raw dashboard data.
2. A pure `summarizeDashboardProject(snapshot)` function that calculates:
   - Completeness
   - Detected stage
   - Open issue count
   - Version count
   - Next step

Do not run one query per project.

Acceptance criteria:

- Dashboard aggregation remains batched.
- Derived dashboard state is unit-tested without Supabase.
- Database query modules no longer import validators or stage-calculation code.

### Phase 6: Extract the export pipeline

Reduce `app/api/projects/[id]/export/route.ts` to a controller that:

1. Authenticates the request.
2. Parses and validates `format` and `preview`.
3. Calls `exportApplication()`.
4. Converts the returned artifact into `NextResponse`.

Suggested structure:

```text
features/exports/
  application/
    export-application.ts
    load-export-context.ts
  formats/
    txt.ts
    pdf.ts
    docx.ts
    latex.ts
    filing-package.ts
  infrastructure/
    attachment-reader.ts
    export-log-repository.ts
  types.ts
```

Use a shared export context:

```ts
export type ExportContext = {
  project: Project;
  sections: Record<SectionKey, string>;
  inventors: Inventor[];
  attachments: Attachment[];
};

export type ExportArtifact = {
  body: Uint8Array | string;
  contentType: string;
  filename: string;
  disposition: "inline" | "attachment";
};
```

Requirements:

- Load the export context once.
- Keep format generation free of HTTP concerns.
- Download independent drawing files concurrently when safe.
- Record only completed downloads, not previews.
- Preserve output sanitization and authorization.
- Use exhaustive format handling so an unsupported value cannot silently fall through.

Acceptance criteria:

- The route handler is small and contains no document-generation implementation.
- Every export formatter can be tested with in-memory fixtures.
- Existing TXT, PDF, DOCX, LaTeX, preview, declaration, and package tests pass.

### Phase 7: Split filing and drawing operations

Separate filing-record management from drawing analysis.

Suggested use cases:

```text
features/filing/application/
  save-inventors.ts
  save-applicant.ts

features/drawings/application/
  delete-attachment.ts
  analyze-drawing.ts
  classify-orientation.ts
  update-drawing-view.ts
```

Keep Storage access, vision-provider calls, rate limiting, and database persistence behind infrastructure adapters.

Acceptance criteria:

- Filing actions no longer contain drawing-provider implementation.
- Drawing operations have explicit authorization and ownership checks.
- Existing filing, upload, drawing, orientation, and export tests pass.

### Phase 8: Enforce architectural boundaries

Add ESLint restrictions or an equivalent lightweight check.

At minimum, prevent domain files from importing:

- `next/*`
- `react`
- `@supabase/*`
- Shared database clients
- Feature infrastructure modules

Also prevent client components from importing server infrastructure.

Illustrative configuration:

```js
{
  files: ["features/*/domain/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          "next/*",
          "react",
          "@supabase/*",
          "@/shared/db/*",
          "@/features/*/infrastructure/*"
        ]
      }
    ]
  }
}
```

Mark all database, provider, repository, and server application modules with:

```ts
import "server-only";
```

Acceptance criteria:

- Architectural violations fail lint.
- The production client bundle does not include server SDKs or document generators.
- Lint has zero errors and preferably zero warnings.

### Phase 9: Documentation cleanup

Rewrite `docs/architecture.md` to document the architecture that actually exists. Include:

- Dependency direction
- Feature-folder responsibilities
- Authentication flow
- One read flow, such as opening Review
- One write flow, such as applying a proposed fix
- Project snapshot rules
- RLS and application-authorization responsibilities
- Testing layers

Reduce `AGENTS.md` to current operating instructions and conventions. Move completed phase history and obsolete implementation notes into `docs/history.md` or remove them if Git already provides the needed history.

The repository's own instruction says `AGENTS.md` should stay concise; honor that requirement.

Acceptance criteria:

- A new contributor can find the route, UI, application operation, domain logic, and persistence adapter for Review in under two minutes.
- Documentation describes current behavior rather than historical phases.

## Patterns to use

### Thin page

```tsx
export default async function ReviewPage({ params }: PageProps) {
  const { id } = await params;
  const model = await getReviewPage(id);
  if (!model) notFound();

  return <ReviewScreen model={model} />;
}
```

### Thin server action

```ts
"use server";

export async function runReviewAction(projectId: string) {
  const viewer = await requireViewer();
  const result = await runReview({ viewer, projectId });
  revalidatePath(`/projects/${projectId}/review`);
  return result;
}
```

### Pure domain calculation

```ts
export function partitionCitations(
  requested: string[],
  valid: ReadonlySet<string>,
): CitationPartition {
  const resolved: string[] = [];
  const dropped: string[] = [];

  for (const citation of new Set(requested)) {
    (valid.has(citation) ? resolved : dropped).push(citation);
  }

  return { resolved, dropped };
}
```

### Infrastructure adapter

```ts
import "server-only";

export class SupabaseCitationRepository implements CitationRepository {
  async findExisting(sectionNumbers: string[]): Promise<Set<string>> {
    // Supabase-specific implementation.
  }
}
```

## Testing strategy

Use three layers:

### Unit tests

Fast and credential-free:

- Claim parsing
- Validators
- Citation partitioning
- Stage detection
- Readiness and completeness
- Dashboard summaries
- Export serializers and filename handling

### Application tests

Use fake or in-memory repositories to verify:

- Review orchestration
- Fix application
- Citation resolution
- Audit-event decisions
- Export selection and recording behavior

### End-to-end tests

Keep Playwright for critical user journeys:

- Authentication and consent
- Project creation and saving
- Review and auto-fix
- Prior-art comparison
- Upload and drawing review
- Filing and exports
- RLS/account isolation
- Accessibility

Do not make Playwright the only place deterministic business rules are tested.

## Commit strategy

Use focused commits that tell the refactor story. Examples:

1. `test: cover deterministic review and stage rules`
2. `refactor: add typed Supabase database boundary`
3. `refactor: centralize protected-route authorization`
4. `refactor: introduce request-scoped project snapshot`
5. `refactor: extract pure review application service`
6. `refactor: split review client by responsibility`
7. `refactor: separate dashboard queries from summaries`
8. `refactor: extract export controller and format handlers`
9. `chore: enforce feature dependency boundaries`
10. `docs: document modular architecture and request flows`

Each commit must leave lint, TypeScript, and relevant tests passing. Avoid vague messages such as `cleanup`, `architecture changes`, or `refactor files`.

## Scope for an MLH-ready improvement

If time is limited, complete only these items before submitting the repository:

1. Unit tests for core deterministic logic
2. Typed Supabase clients
3. Centralized protected-route authorization
4. Request-cached project snapshot
5. Complete review-feature vertical slice
6. Extracted export pipeline
7. CI running unit tests, lint, TypeScript, and build
8. Updated architecture documentation

Do not delay the application to migrate every feature. A fully completed reference slice with enforced boundaries is more convincing than a half-finished repository-wide reorganization.

## Final verification checklist

- [ ] Public URLs are unchanged.
- [ ] Authentication and consent behavior is unchanged.
- [ ] RLS and explicit ownership checks remain intact.
- [ ] Domain modules contain no framework or infrastructure imports.
- [ ] Protected pages do not duplicate viewer/profile checks.
- [ ] Common project data uses request-level deduplication.
- [ ] Dashboard loading remains batched.
- [ ] Independent server reads run concurrently.
- [ ] Server actions and route handlers are thin.
- [ ] Export formatters do not depend on HTTP request/response objects.
- [ ] Supabase clients use generated database types.
- [ ] Server-only modules are marked as such.
- [ ] Unit tests run without external credentials.
- [ ] Existing Playwright flows continue to pass.
- [ ] Lint, TypeScript, build, and tests pass in CI.
- [ ] `docs/architecture.md` matches the implementation.
- [ ] `AGENTS.md` contains current guidance rather than a historical changelog.

## Instruction to the implementing agent

Before editing:

1. Read the repository's `AGENTS.md`, `CLAUDE.md`, `docs/architecture.md`, and relevant feature files completely.
2. Inspect the current working tree and preserve unrelated user changes.
3. Run the existing verification commands and report the baseline.
4. Propose the first small refactor slice based on the current code; do not assume paths in this brief are already present.

During implementation:

1. Work phase by phase.
2. Keep at most one architectural migration partially complete at a time.
3. Run focused tests after each change and the full relevant gate before moving on.
4. Do not add abstractions with no immediate use.
5. Do not change product behavior unless a confirmed bug requires it.
6. Record any intentional deviation from this brief and explain why it better fits the actual code.

At handoff, provide:

- A concise architecture summary
- Files moved or introduced
- Dependency boundaries established
- Tests added
- Commands run and their results
- Remaining phases and risks

