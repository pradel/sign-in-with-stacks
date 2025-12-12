import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Get build to work waiting for a new release of next.js
    // https://github.com/vercel/next.js/issues/86099#issuecomment-3612857492
    resolveAlias: {
      pino: "./src/shims/pino.ts",
      "thread-stream": "./src/shims/thread-stream.ts",
    },
  },
};

export default nextConfig;
