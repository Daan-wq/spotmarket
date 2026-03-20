import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      { source: "/creator", destination: "/dashboard", permanent: true },
      { source: "/creator/campaigns", destination: "/campaigns", permanent: true },
      { source: "/creator/campaigns/:path*", destination: "/campaigns/:path*", permanent: true },
      { source: "/creator/profile", destination: "/profile", permanent: true },
      { source: "/creator/earnings", destination: "/earnings", permanent: true },
    ];
  },
};

export default nextConfig;
