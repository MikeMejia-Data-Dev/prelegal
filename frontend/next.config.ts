import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build to static files in out/ so FastAPI can serve them.
  output: "export",
  trailingSlash: true,
};

// In `next dev`, forward /api calls to the FastAPI backend on port 8000.
if (process.env.NODE_ENV === "development") {
  nextConfig.rewrites = async () => [{ source: "/api/:path*", destination: "http://localhost:8000/api/:path*" }];
}

export default nextConfig;
