import type { NextConfig } from "next";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    return [
      { source: "/api/:path*", destination: `${BACKEND}/api/:path*` },
      { source: "/oauth2/:path*", destination: `${BACKEND}/oauth2/:path*` },
    ];
  },
};

export default nextConfig;
