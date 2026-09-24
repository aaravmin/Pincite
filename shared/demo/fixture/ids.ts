/**
 * Fixed identifiers for the demo matter. Both the fixture generator
 * (scripts/build-demo-fixture.mjs) and the app code read them from here, so the seeded rows,
 * the in-memory viewer, and the end-to-end spec always agree on who and what the demo is.
 * Valid v4-shaped UUIDs, so anything that inspects the format is satisfied.
 */
export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";
export const DEMO_USER_EMAIL = "demo@pincite.local";
export const DEMO_PROJECT_ID = "00000000-0000-4000-8000-000000000010";
export const DEMO_ATTACHMENT_ID = "00000000-0000-4000-8000-000000000020";
export const DEMO_VERSION_ID = "00000000-0000-4000-8000-000000000030";
export const DEMO_MATCH_ID = "00000000-0000-4000-8000-000000000040";

/** The FIG. 1 fixture lives in public/ so the storage stub can serve it without a bucket. */
export const DEMO_FIGURE_STORAGE_PATH = "demo/apple-container-fig01.png";
export const DEMO_FIGURE_FILENAME = "apple-container-fig01.png";

/** The clock the fixture is written against, so generated rows are byte-for-byte stable. */
export const DEMO_EPOCH = "2026-09-14T15:00:00.000Z";
