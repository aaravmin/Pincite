import { dirname } from "path";
import { fileURLToPath } from "url";
import { readdirSync } from "fs";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/**
 * ARCHITECTURAL BOUNDARIES (brief phase 8).
 *
 * The dependency direction the codebase is built on:
 *
 *   app/ and ui/  ->  application/  ->  domain/
 *                                   ->  infrastructure/
 *
 * These rules make that direction fail lint instead of relying on review. Fix a violation
 * by moving the code to the layer it belongs in, never by disabling the rule.
 *
 * `no-restricted-imports` does not merge across flat-config entries - the last entry that
 * matches a file wins for that rule - so each entry below carries the FULL pattern list for
 * the files it matches, and the entries are ordered least to most specific.
 */

/** The feature directories, read from disk so a new feature is covered automatically. */
const FEATURES = readdirSync(new URL("./features", import.meta.url), {
  withFileTypes: true,
})
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

/** The old flat layout. Nothing may reintroduce it. */
const NO_LIB = [
  {
    group: ["@/lib", "@/lib/*"],
    message:
      "lib/ no longer exists. Import from the owning feature (@/features/<feature>/{domain,application,infrastructure,ui}) or from @/shared/*.",
  },
];

/**
 * The pure layer: feature domain modules and the dependency-free shared helpers. Plain data
 * in, plain data out - no framework, no I/O, no clock, no auth. That is what makes them
 * testable without credentials and reusable from both the app and the Remotion film.
 *
 * `@/shared/db/database.types` is the one allowed exception: it is generated, types-only,
 * and emits no runtime code, so a domain row-to-object mapper may name the row shape it
 * maps from. Every other module under shared/db is a live Supabase client.
 */
const PURE_LAYER = [
  {
    group: ["next", "next/*", "react", "react-dom", "react/*", "server-only"],
    message:
      "Domain and shared pure modules must not depend on the framework. Move anything that needs Next, React, or the server/client boundary into application, ui, or app.",
  },
  {
    group: ["@supabase/*", "@/shared/db/*", "!@/shared/db/database.types"],
    message:
      "Domain and shared pure modules must not reach the database. Take the data as a parameter and let application/infrastructure do the reading. (The generated @/shared/db/database.types is types-only and is allowed.)",
  },
  {
    group: [
      "@/features/*/infrastructure/*",
      "@/features/*/application/*",
      "@/features/*/actions",
      "@/features/*/ui/*",
    ],
    message:
      "Dependencies point inward: domain may import other domain modules only. Application composes domain with infrastructure, not the other way round.",
  },
  {
    group: [
      "@/shared/llm/*",
      "@/shared/audit/log",
      "@/shared/rate-limit/*",
      "@/shared/auth/require-viewer",
    ],
    message:
      "Providers, auditing, rate limiting, and the viewer are application concerns. A domain function must stay a pure calculation over the data it is given.",
  },
];

/**
 * The client/presentation layer: feature UI, shared components, the visual layer, and the
 * Remotion film. These are bundled for the browser (or rendered by Remotion), so a server
 * SDK, a service-role client, or a provider key reached from here would be a real leak, not
 * just a layering smell. UI talks to the server through its feature's `actions.ts`.
 */
const UI_LAYER = [
  {
    group: [
      "@/features/*/infrastructure/*",
      "@/shared/db/server",
      "@/shared/db/admin",
      "@/shared/llm/*",
      "@/shared/audit/log",
      "@/shared/rate-limit/*",
      "@/shared/auth/require-viewer",
      "server-only",
    ],
    message:
      "UI must not import server infrastructure. Call the feature's actions.ts, or receive the data as a prop from a server component.",
  },
];

/**
 * Routes and layouts: composition only. A page loads one application model; a route handler
 * authenticates, validates, calls one application operation, and translates the result.
 * Neither reaches a repository or the service-role client directly.
 */
const APP_LAYER = [
  {
    group: ["@/features/*/infrastructure/*", "@/shared/db/admin"],
    message:
      "Routes must go through an application module. Repositories and the service-role client are internal to a feature.",
  },
];

/** A feature may use its OWN infrastructure, never another feature's. */
const crossFeature = (feature) => [
  {
    group: [
      "@/features/*/infrastructure/*",
      `!@/features/${feature}/infrastructure/*`,
    ],
    message: `features/${feature} must not import another feature's infrastructure. Cross a feature boundary through its domain, application, actions, or ui instead.`,
  },
];

const restrict = (...groups) => ({
  "no-restricted-imports": ["error", { patterns: groups.flat() }],
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "e2e/**",
      "screenshots/**",
      "next-env.d.ts",
    ],
  },

  // Least specific first; a later entry replaces the rule for the files it matches.
  {
    files: ["**/*.{ts,tsx,mts,mjs}"],
    rules: restrict(NO_LIB),
  },
  {
    files: ["app/**/*.{ts,tsx}"],
    rules: restrict(NO_LIB, APP_LAYER),
  },
  {
    files: ["components/**/*.{ts,tsx}", "src/**/*.{ts,tsx}", "remotion/**/*.{ts,tsx}"],
    rules: restrict(NO_LIB, UI_LAYER),
  },
  {
    files: [
      "shared/text/**/*.ts",
      "shared/format.ts",
      "shared/utils.ts",
      "shared/auth/types.ts",
      "shared/auth/access.ts",
      "shared/audit/action-types.ts",
    ],
    rules: restrict(NO_LIB, PURE_LAYER),
  },

  // One entry per feature, so the "not another feature's infrastructure" rule names the
  // feature it is protecting. Domain and ui get the stricter layer rules on top.
  ...FEATURES.flatMap((feature) => [
    {
      files: [`features/${feature}/**/*.{ts,tsx}`],
      rules: restrict(NO_LIB, crossFeature(feature)),
    },
    {
      files: [`features/${feature}/ui/**/*.{ts,tsx}`],
      rules: restrict(NO_LIB, crossFeature(feature), UI_LAYER),
    },
    {
      files: [`features/${feature}/domain/**/*.{ts,tsx}`],
      rules: restrict(NO_LIB, PURE_LAYER),
    },
  ]),
];

export default eslintConfig;
