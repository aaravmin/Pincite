import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so a stray lockfile elsewhere does not confuse
  // file tracing.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
