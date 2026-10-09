import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships WASM + data files; postgres-js is Node-only. Keep both out of the bundle.
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  // Course content lives one level up, outside the app root.
  outputFileTracingRoot: new URL("..", import.meta.url).pathname,
  outputFileTracingIncludes: { "/**": ["../content/**/*"] },
};

export default nextConfig;
