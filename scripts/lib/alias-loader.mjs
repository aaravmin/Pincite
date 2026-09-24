// Preload with `node --import ./scripts/lib/alias-loader.mjs` to resolve the "@/..." alias
// (see scripts/lib/alias-hooks.mjs).
import { register } from "node:module";
register("./alias-hooks.mjs", import.meta.url);
