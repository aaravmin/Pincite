import { defineConfig, type Plugin } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * `server-only` / `client-only` are build-time markers for the Next.js bundler: importing
 * one is how a module declares which side of the boundary it belongs to. Neither has any
 * meaning under the vitest node runner, and neither is resolvable from the root under pnpm,
 * so they are stubbed out here rather than installed.
 */
function stubBoundaryMarkers(): Plugin {
  const markers = new Set(["server-only", "client-only"]);
  return {
    name: "pincite-stub-boundary-markers",
    enforce: "pre",
    resolveId(id) {
      return markers.has(id) ? `\0${id}-stub` : null;
    },
    load(id) {
      return id === "\0server-only-stub" || id === "\0client-only-stub"
        ? "export {};"
        : null;
    },
  };
}

/**
 * Fast, credential-free unit tests for the deterministic logic (validators, claim parsing,
 * stage detection, readiness math, export serializers). These must never need Supabase,
 * BigQuery, an LLM key, or a browser - the end-to-end journeys stay in Playwright (e2e/),
 * which is excluded here.
 */
export default defineConfig({
  plugins: [stubBoundaryMarkers(), tsconfigPaths()],
  test: {
    environment: "node",
    include: [
      "features/**/*.test.ts",
      "shared/**/*.test.ts",
      "lib/**/*.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/.next/**", "e2e/**"],
  },
});
