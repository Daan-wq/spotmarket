import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' *.supabase.co api.instagram.com graph.instagram.com graph.facebook.com *.stripe.com",
      "frame-src 'self' js.stripe.com www.instagram.com www.facebook.com discord.com",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      // Instagram profile pictures and media thumbnails
      { protocol: "https", hostname: "*.cdninstagram.com" },
      { protocol: "https", hostname: "cdninstagram.com" },
      // Meta CDN fallback
      { protocol: "https", hostname: "*.fbcdn.net" },
    ],
  },
  async redirects() {
    return [
      { source: "/dashboard", destination: "/creator/dashboard", permanent: false },
      { source: "/campaigns", destination: "/creator/campaigns", permanent: false },
      { source: "/campaigns/:path*", destination: "/creator/campaigns/:path*", permanent: false },
      { source: "/profile", destination: "/creator/profile", permanent: false },
      { source: "/earnings", destination: "/creator/earnings", permanent: false },
      { source: "/creator/payouts", destination: "/creator/profile?tab=balance", permanent: true },
      { source: "/creator/instagram", destination: "/creator/pages", permanent: true },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
