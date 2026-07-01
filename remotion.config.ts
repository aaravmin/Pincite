import path from "node:path";
import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind-v4";

// Tailwind v4 so the video speaks the same three-signal token language as the
// app, plus the same path aliases (@/ and @visual/) so it renders the REAL
// shared visual components, not mockups.
Config.overrideWebpackConfig((current) => {
  const withTailwind = enableTailwind(current);
  return {
    ...withTailwind,
    resolve: {
      ...withTailwind.resolve,
      alias: {
        ...(withTailwind.resolve?.alias ?? {}),
        "@": path.resolve(process.cwd()),
        "@visual": path.resolve(process.cwd(), "src/visual"),
      },
    },
  };
});

Config.setVideoImageFormat("jpeg");
Config.setConcurrency(4);
