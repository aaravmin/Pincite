// Module resolution hooks that map the repo's "@/..." import alias (tsconfig paths) to files
// on disk, so plain Node 24 can run the pure TypeScript domain modules under its default type
// stripping. Registered by scripts/lib/alias-loader.mjs; used by scripts/build-demo-fixture.mjs.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
const ROOT = new URL("../../", import.meta.url).href; // repo root
export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const base = ROOT + specifier.slice(2);
    for (const ext of ["", ".ts", ".tsx", "/index.ts"]) {
      const candidate = base + ext;
      const file = fileURLToPath(candidate);
      if (existsSync(file) && !file.endsWith("/")) return next(candidate, context);
    }
  }
  return next(specifier, context);
}
