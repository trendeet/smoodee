import type { NextConfig } from "next";
import path from "path";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  output: "standalone",
  // 루트에 lefthook용 package-lock.json이 추가되면서 Next가 워크스페이스 루트를 잘못
  // 추론하는 경우가 있어 명시적으로 고정한다.
  outputFileTracingRoot: path.join(__dirname),
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    return [
      { source: "/api/:path*", destination: `${BACKEND}/api/:path*` },
      { source: "/oauth2/:path*", destination: `${BACKEND}/oauth2/:path*` },
    ];
  },
};

export default nextConfig;
