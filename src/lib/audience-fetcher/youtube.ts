/**
 * YouTube audience demographics — wraps fetchVideoDemographics over the
 * trailing 90 days for the connected channel.
 */

import type { CreatorYtConnection } from "@prisma/client";
import { fetchVideoDemographics } from "@/lib/youtube";
import { getFreshYoutubeAccessToken } from "@/lib/token-refresh";
import type { AudienceFetchResult } from "./index";

export async function fetchYtAudience(
  conn: CreatorYtConnection,
): Promise<AudienceFetchResult> {
  let token: string | null;
  try {
    token = await getFreshYoutubeAccessToken(conn);
  } catch {
    return { ok: false, audience: null, tokenBroken: true, reason: "token refresh failed" };
  }
  if (!token) return { ok: false, audience: null, tokenBroken: true, reason: "no token" };

  const end = new Date();
  const start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);

  let demographics;
  try {
    demographics = await fetchVideoDemographics(token, conn.channelId, startDate, endDate);
  } catch (err) {
    const msg = (err as Error).message?.toLowerCase() ?? "";
    return {
      ok: false,
      audience: null,
      tokenBroken: msg.includes("oauth") || msg.includes("token") || msg.includes("invalid"),
      reason: (err as Error).message,
    };
  }

  // YouTube returns percentage already (0..100). Normalize to 0..1 fractions.
  const ageBuckets: Record<string, number> = {};
  for (const [k, v] of Object.entries(demographics.ages ?? {})) {
    ageBuckets[k] = (v as number) / 100;
  }
  const male = (demographics.genders?.male ?? 0) / 100;
  const female = (demographics.genders?.female ?? 0) / 100;
  const totalGender = male + female;
  const genderSplit = {
    male: totalGender > 0 ? male / totalGender : 0,
    female: totalGender > 0 ? female / totalGender : 0,
    other: 0,
  };
  const topCountries = Object.entries(demographics.countries ?? {})
    .map(([code, pct]) => ({ code, share: (pct as number) / 100 }))
    .sort((a, b) => b.share - a.share)
    .slice(0, 10);

  return {
    ok: true,
    audience: { ageBuckets, genderSplit, topCountries, totalReach: null },
    tokenBroken: false,
  };
}
