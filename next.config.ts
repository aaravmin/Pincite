import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so a stray lockfile elsewhere does not confuse
  // file tracing.
  turbopack: {
    root: __dirname,
  },
  // Hide the dev-only on-screen indicator (the floating "N" badge).
  devIndicators: false,
  // The demo film keeps a stable filename but its bytes change on every re-render.
  // Force revalidation so browsers never replay a stale cached copy.
  async headers() {
    return [
      {
        source: "/pincite-demo.mp4",
        headers: [{ key: "Cache-Control", value: "no-cache, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
