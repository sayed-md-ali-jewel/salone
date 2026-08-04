import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typedRoutes: true,
  experimental: {
    serverActions: {
      allowedOrigins: [
        "royalearab.mrgroupctg.com",
        "www.royalearab.mrgroupctg.com"
      ]
    }
  }
};

export default nextConfig;
