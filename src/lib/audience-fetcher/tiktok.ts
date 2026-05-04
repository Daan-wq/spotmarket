/**
 * TikTok audience demographics — uses TikTok Business API
 * (gated behind TIKTOK_BUSINESS_API=true).
 *
 * The connection's TikTok Business id is not stored on the connection model
 * yet, so this fetcher returns "no data" if no business id is supplied.
 */

import type { CreatorTikTokConnection } from "@prisma/client";
import { fetchTikTokDemographics } from "@/lib/tiktok";
import { getFreshTikTokAccessToken } from "@/lib/token-refresh";
import type { AudienceFetchResult } from "./index";

export async function fetchTtAudience(
  conn: CreatorTikTokConnection,
): Promise<AudienceFetchResult> {
  if (process.env.TIKTOK_BUSINESS_API !== "true") {
    return { ok: false, audience: null, tokenBroken: false, reason: "TIKTOK_BUSINESS_API disabled" };
  }
  if (!conn.tikTokOpenId) {
    return { ok: false, audience: null, tokenBroken: false, reason: "no business id" };
  }

  let token: string | null;
  try {
    token = await getFreshTikTokAccessToken(conn);
  } catch {
    return { ok: false, audience: null, tokenBroken: true, reason: "token refresh failed" };
  }
  if (!token) return { ok: false, audience: null, tokenBroken: true, reason: "no token" };

  try {
    const demographics = await fetchTikTokDemographics(token, conn.tikTokOpenId);

    const ageTotal = Object.values(demographics.ages ?? {}).reduce((s, v) => s + v, 0);
    const ageBuckets: Record<string, number> = {};
    if (ageTotal > 0) {
      for (const [k, v] of Object.entries(demographics.ages ?? {})) {
        ageBuckets[k] = v / ageTotal;
      }
    }
    const male = demographics.genders?.male ?? 0;
    const female = demographics.genders?.female ?? 0;
    const totalGender = male + female;
    const genderSplit =
      totalGender > 0
        ? { male: male / totalGender, female: female / totalGender, other: 0 }
        : { male: 0, female: 0, other: 0 };
    const countryTotal = Object.values(demographics.countries ?? {}).reduce((s, v) => s + v, 0);
    const topCountries = Object.entries(demographics.countries ?? {})
      .map(([code, n]) => ({ code, share: countryTotal > 0 ? n / countryTotal : 0 }))
      .sort((a, b) => b.share - a.share)
      .slice(0, 10);

    return {
      ok: true,
      audience: { ageBuckets, genderSplit, topCountries, totalReach: null },
      tokenBroken: false,
    };
  } catch (err) {
    return { ok: false, audience: null, tokenBroken: false, reason: (err as Error).message };
  }
}
