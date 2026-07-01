import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so a stray lockfile elsewhere does not confuse
  // file tracing.
  turbopack: {
    root: __dirname,
  },
  // Native module: let Node require it at runtime rather than having the bundler pack the
  // platform-specific .node binding (which breaks it, "Cannot find native binding"). Used by the
  // drawing vectorizer (lib/vector) to rasterize/decode figures.
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist"],
  experimental: {
    // Saving an edited vector scene posts the whole scene (traced path data) to a server
    // action; a dense drawing can be a few MB, well over the 1 MB default.
    serverActions: { bodySizeLimit: "8mb" },
  },
  // Hide the dev-only on-screen indicator (the floating "N" badge).
  devIndicators: false,
};

export default nextConfig;
