import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getAppUrlFromHost } from "@/lib/app-url";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headerStore = await headers();
  const host = headerStore.get("x-host") ?? headerStore.get("host");

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
    host: getAppUrlFromHost(host),
  };
}
