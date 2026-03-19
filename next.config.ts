import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output bundles only the necessary files for deployment.
  // Required for Railway (and similar platforms) — run with: node .next/standalone/server.js
  output: "standalone",
};

export default nextConfig;
