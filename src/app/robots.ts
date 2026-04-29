import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: "/",
      },
      {
        userAgent: "facebookexternalhit",
        allow: ["/privacy", "/api/auth/facebook/data-deletion"],
        disallow: "/",
      },
    ],
    host: "https://app.clipprofit.com",
  };
}
