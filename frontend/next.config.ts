import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build to static files in out/ so FastAPI can serve them.
  output: "export",
  trailingSlash: true,
};

export default nextConfig;
