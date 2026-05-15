import { redirect } from "next/navigation";
import { isPlatformSlug } from "@/lib/stats/types";
import { parseRange } from "@/lib/stats/range";

interface PageProps {
  params: Promise<{ platform: string }>;
  searchParams: Promise<{ range?: string }>;
}

/**
 * Legacy redirect — the per-platform stats view has been merged into
 * /creator/connections (Accounts Workspace).
 */
export default async function LegacyPlatformStatsRedirect({ params, searchParams }: PageProps) {
  const { platform } = await params;
  const sp = await searchParams;
  const range = parseRange(sp);
  const target = new URLSearchParams();
  if (isPlatformSlug(platform)) target.set("platform", platform);
  if (range.key !== "30d") target.set("range", range.key);
  const qs = target.toString();
  redirect(`/creator/connections${qs ? `?${qs}` : ""}`);
}
