import type { NextConfig } from "next";

/** Set by the Docker build (CI passes the commit SHA); unset in local dev. */
const gitSha = process.env.GIT_SHA || undefined;

const nextConfig: NextConfig = {
  /* config options here */
  // Self-contained server (.next/standalone) for the Docker image: no node_modules install at runtime.
  output: "standalone",
  // Same build ID + deployment ID on every pod of one release; during a rolling update a client
  // holding the old version gets a hard reload instead of 404ing on missing chunks.
  generateBuildId: gitSha ? async () => gitSha : undefined,
  deploymentId: gitSha,
  // `next dev` must not generate extra files in the project root.
  agentRules: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
