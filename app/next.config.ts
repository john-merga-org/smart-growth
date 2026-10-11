import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships WASM + data files; postgres-js is Node-only. Keep both out of the bundle.
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  // Course content lives one level up, outside the app root. Migrations are read from disk at
  // runtime (src/lib/db/index.ts). Neither is traced automatically, so ship both with every function.
  outputFileTracingRoot: new URL("..", import.meta.url).pathname,
  outputFileTracingIncludes: { "/**": ["../content/**/*", "./drizzle/**/*"] },
};

export default nextConfig;
